const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🔐 আপনার দেওয়া Steadfast API Credentials
const STEADFAST_API_KEY = "puqmh5ebcoaegq6kdxef2oohbabwttym";
const STEADFAST_SECRET_KEY = "w5wpkhamys6neqawvcntn6yu";

// 🔌 অন্যান্য কুরিয়ার (আপাতত খালি রাখা হয়েছে, পরে কি বসালেই কাজ করবে)
const REDX_API_TOKEN = "YOUR_REDX_API_TOKEN";
const PATHAO_CLIENT_ID = "YOUR_PATHAO_CLIENT_ID";
const PATHAO_CLIENT_SECRET = "YOUR_PATHAO_CLIENT_SECRET";
const PATHAO_USERNAME = "YOUR_PATHAO_USERNAME";
const PATHAO_PASSWORD = "YOUR_PATHAO_PASSWORD";

// মূল ভেরিফিকেশন এন্ডপয়েন্ট
app.get('/api/verify', async (req, res) => {
    let phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({ status: "error", message: "নম্বর দেওয়া হয়নি!" });
    }

    // নম্বরের ফরম্যাট ঠিক করা (যেমন: +88 বা 88 থাকলে কেটে শুধু 01XXXXXXXXX করা)
    phone = phone.trim();
    if (phone.startsWith("+88")) {
        phone = phone.replace("+88", "");
    } else if (phone.startsWith("88")) {
        phone = phone.substring(2);
    }
    if (!phone.startsWith("0")) {
        phone = "0" + phone;
    }

    // ফাইনাল রেজাল্ট ফরম্যাট
    let report = {
        status: "success",
        phone: phone,
        whatsapp: "Active", // ফ্রন্টএন্ডে সরাসরি চ্যাট ওপেন করার জন্য লিংক হ্যান্ডেল করবে
        steadfast: "কোনো ডাটা পাওয়া যায়নি",
        pathao: "Integrating...",
        redx: "Integrating..."
    };

    // ==========================================
    // 🚀 ১. STEADFAST REAL FRAUD CHECK INTEGRATION
    // ==========================================
    try {
        const sfRes = await axios.post('https://portal.steadfast.com.bd/api/v1/fraud-check', 
        { 
            phone: phone 
        }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json' 
            } 
        });

        // Steadfast থেকে রেসপন্স সফলভাবে আসলে ডাটা ফিল্টার করা
        if (sfRes.data && sfRes.data.status === 200) {
            let data = sfRes.data.data;
            report.steadfast = `ডেলিভারি সাকসেস রেট: ${data.success_rate || 0}% (মোট অর্ডার: ${data.total_order || 0}, রিটার্ন: ${data.total_return || 0})`;
        } else {
            report.steadfast = "কোনো পূর্ববর্তী রেকর্ড পাওয়া যায়নি";
        }
    } catch (err) {
        console.error("Steadfast API Error:", err.message);
        report.steadfast = "চেক করা যায়নি বা কুরিয়ার সার্ভারে সমস্যা";
    }

    // ==========================================
    // 🚀 ২. REDX FRAUD CHECK (বাকি ক্রেডেনশিয়াল দিলে সচল হবে)
    // ==========================================
    try {
        if(REDX_API_TOKEN !== "YOUR_REDX_API_TOKEN") {
            const rxRes = await axios.get(`https://api.redx.com.bd/v1/parcel/fraud-check/${phone}`, {
                headers: { 'Authorization': `Bearer ${REDX_API_TOKEN}`, 'Content-Type': 'application/json' }
            });
            if (rxRes.data) {
                let data = rxRes.data;
                report.redx = `রিটার্ন রেট: ${data.return_rate || 0}% (মোট পার্সেল: ${data.total_parcels || 0})`;
            }
        } else {
            report.redx = "কী (API Key) সেট করা নেই";
        }
    } catch (err) {
        report.redx = "রেকর্ড নেই বা চেক করা যায়নি";
    }

    // ==========================================
    // 🚀 ৩. PATHAO FRAUD CHECK (বাকি ক্রেডেনশিয়াল দিলে সচল হবে)
    // ==========================================
    try {
        if(PATHAO_CLIENT_ID !== "YOUR_PATHAO_CLIENT_ID") {
            const tokenRes = await axios.post('https://api-hermes.pathao.com/aladdin/api/v1/issue-token', {
                client_id: PATHAO_CLIENT_ID,
                client_secret: PATHAO_CLIENT_SECRET,
                username: PATHAO_USERNAME,
                password: PATHAO_PASSWORD,
                grant_type: "password"
            });

            const pathaoToken = tokenRes.data.access_token;

            const ptRes = await axios.get(`https://api-hermes.pathao.com/aladdin/api/v1/customers/fraud-check?phone=${phone}`, {
                headers: { 'Authorization': `Bearer ${pathaoToken}`, 'Content-Type': 'application/json' }
            });

            if (ptRes.data) {
                let data = ptRes.data.data;
                report.pathao = `সাকসেস রেট: ${data.success_rate || 0}% (ডেলিভারি: ${data.successful_orders || 0}, রিটার্ন: ${data.returned_orders || 0})`;
            }
        } else {
            report.pathao = "কী (API Key) সেট করা নেই";
        }
    } catch (err) {
        report.pathao = "রেকর্ড নেই বা চেক করা যায়নি";
    }

    // সব ডাটা একসাথে ফ্রন্টএন্ডে পাঠানো
    res.json(report);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));