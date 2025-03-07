const http = require('http');
const https = require('https');

// Utilities remain the same
const Utilities = {
    CreateJWT: (username, secret) => {
        const jwt = require('jsrsasign');
        const claims = {
            'iss': username,
            'iat': Math.round(Date.now() / 1000)
        }

        const headers = { alg: "HS256", typ: "JWT" };
        return jwt.jws.JWS.sign("HS256", JSON.stringify(headers), JSON.stringify(claims), secret);
    },
    GenerateID: (length = 10) => {
        const characters = '0123456789abcdefghijklmnopqrstuvwxyz';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },
    // Helper function for making HTTP requests
    makeRequest: (url, options) => {
        return new Promise((resolve, reject) => {
            const getHttpModule = (url) => url.startsWith('https://') ? https : http;
            
            const req = getHttpModule(url).request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        if (data) {
                            const parsedData = JSON.parse(data);
                            resolve(parsedData);
                        } else {
                            resolve({ status: 'success' });
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            req.on('error', (error) => { reject(error); });
            req.end();
        });
    }
};

// Combined function that does cleanup first, then creates account
const createAccount = async (baseUrl, username, secret) => {
    // Create JWT token for authorization
    const token = Utilities.CreateJWT(username, secret);
    
    // Step 1: Call cleanup endpoint
    const cleanupUrl = `${baseUrl}/cypress/cleanup`;
    console.log('calling cleanup')
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": 'application/json',
            'Content-Length': 0
        }
    };
    
    try {
        // First do cleanup
        await Utilities.makeRequest(cleanupUrl, { ...options, method: 'GET' });
        
        // Then create new account
        const generatedUsername = Utilities.GenerateID(10);
        const createUrl = `${baseUrl}/cypress/create_user/${generatedUsername}`;
        
        return await Utilities.makeRequest(createUrl, { ...options, method: 'POST' });
    } catch (error) {
        console.error('Error in account creation process:', error);
        throw error;
    }
};

module.exports = createAccount;
