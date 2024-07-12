const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Global Constants
const BASE_URL = "http://20.244.56.144/test";
const PAGE_SIZE = 10;
let accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzIwNzc4MzY1LCJpYXQiOjE3MjA3NzgwNjUsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImM2NGY5NjU1LWJhMWUtNDE2MS1iMTZmLTY0YTM3NjIzMDVkMSIsInN1YiI6ImhhcnNoLnNoYXJtYTFfY3MyMUBnbGEuYWMuaW4ifSwiY29tcGFueU5hbWUiOiJnb01hcnQiLCJjbGllbnRJRCI6ImM2NGY5NjU1LWJhMWUtNDE2MS1iMTZmLTY0YTM3NjIzMDVkMSIsImNsaWVudFNlY3JldCI6ImNUaHJ1T09WU0NvckJzamgiLCJvd25lck5hbWUiOiJIYXJzaCIsIm93bmVyRW1haWwiOiJoYXJzaC5zaGFybWExX2NzMjFAZ2xhLmFjLmluIiwicm9sbE5vIjoiMjExNTAwMDQ0NSJ9.1h-nuCBMj9MSKot3sSu0bOkha17Icwo3eoB71cQZgeM";


async function authenticateWithServer() {
    const url = `${BASE_URL}/auth`;
    const payload = {
        companyName: "goMart",
        clientID: "c64f9655-ba1e-4161-b16f-64a3762305d1",
        clientSecret: "cThruOOVSCorBsjh",
        ownerName: "Harsh",
        ownerEmail: "harsh.sharma1_cs21@gla.ac.in",
        rollNo: "2115000445"
    };

    try {
        const response = await axios.post(url, payload);
        accessToken = response.data.access_token;
    } catch (error) {
        console.error("Authentication failed. No access token received.");
    }
}


async function fetchProductsFromServer(company, category, top, minPrice, maxPrice) {
    const url = `${BASE_URL}/companies/${company}/categories/${category}/products`;
    const params = {
        top: top,
        minPrice: minPrice,
        maxPrice: maxPrice
    };
    const headers = {
        Authorization: `Bearer ${accessToken}`
    };

    try {
        const response = await axios.get(url, { params, headers });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch products for company ${company}: ${error}`);
        return [];
    }
}


function generateProductId(product) {
    const productString = `${product.productName}-${product.price}-${product.rating}`;
    return crypto.createHash('md5').update(productString).digest('hex');
}


app.get('/categories/:categoryName/products', async (req, res) => {
    const { categoryName } = req.params;
    const top = parseInt(req.query.top || 10);
    const page = parseInt(req.query.page || 1);
    const minPrice = parseInt(req.query.minPrice || 0);
    const maxPrice = parseInt(req.query.maxPrice || Infinity);
    const sortBy = req.query.sortBy || 'price';
    const sortOrder = req.query.sortOrder || 'asc';

    const companies = ["AMZ", "FLP", "SNP", "MYN", "AZO"];
    let allProducts = [];

    for (const company of companies) {
        const products = await fetchProductsFromServer(company, categoryName, top, minPrice, maxPrice);
        for (const product of products) {
            product.id = generateProductId(product);
            product.company = company;
        }
        allProducts = allProducts.concat(products);
    }

    const reverseOrder = sortOrder === 'desc';
    allProducts.sort((a, b) => {
        return reverseOrder ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy];
    });

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    const response = {
        products: paginatedProducts,
        total: allProducts.length,
        page: page,
        pageSize: PAGE_SIZE
    };

    res.json(response);
});


app.get('/categories/:categoryName/products/:productId', async (req, res) => {
    const { categoryName, productId } = req.params;
    const companies = ["AMZ", "FLP", "SNP", "MYN", "AZO"];

    for (const company of companies) {
        const products = await fetchProductsFromServer(company, categoryName, 100, 0, Infinity);
        const product = products.find(prod => generateProductId(prod) === productId);
        if (product) {
            return res.json(product);
        }
    }

    return res.status(404).json({ error: "Product not found" });
});


app.listen(PORT, async () => {
    await authenticateWithServer();
    console.log(`Server is running on port ${PORT}`);
});