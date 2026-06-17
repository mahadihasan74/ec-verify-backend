const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Render-এর Environment Variables থেকে সুরক্ষিতভাবে কী-গুলো নেওয়া হচ্ছে
const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || "puqmh5ebcoaegq6kdxef2oohbabwttym";
const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || "w5wpkhamys6neqawvcntn6yu";

const REDX_API_TOKEN = "YOUR_REDX_API_TOKEN";
const PATHAO_CLIENT_ID = "YOUR_PATHAO_CLIENT_ID";

app.get('/api/verify', async (req, res) => {
    let phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({ status: "error", message: "নম্বর দেওয়া হয়নি!" });
    }

    phone = phone.trim();
    if (phone.startsWith("+88")) {
        phone = phone.replace("+88", "");
    } else if (phone.startsWith("88")) {
        phone = phone.substring(2);
    }
    if (!phone.startsWith("0")) {
        phone = "0" + phone;
    }

    let report = {
        status: "success",
        phone: phone,
        whatsapp: "Active",
        steadfast: "কোনো ডাটা পাওয়া যায়নি",
        pathao: "কী (API Key) সেট করা নেই",
        redx: "কী (API Key) সেট করা নেই"
    };

    // ==========================================
    // 🚀 ১. STEADFAST FRAUD CHECK
    // ==========================================
    try {
        // আমরা রিকোয়েস্ট টাইপ এবং হেডার চেক করছি
        const sfRes = await axios.post('https://portal.steadfast.com.bd/api/v1/fraud-check', 
        { 
            phone: phone 
        }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json' 
            },
            timeout: 5000 // ৫ সেকেন্ডের মধ্যে রেসপন্স না আসলে কেটে যাবে
        });

        if (sfRes.data && (sfRes.data.status === 200 || sfRes.data.status === 'success')) {
            let data = sfRes.data.data || sfRes.data;
            report.steadfast = `ডেলিভারি: ${data.success_rate || 0}% (মোট: ${data.total_order || 0}, রিটার্ন: ${data.total_return || 0})`;
        } else if (sfRes.data && sfRes.data.message) {
            report.steadfast = sfRes.data.message; // স্টেডফাস্ট নিজস্ব কোনো মেসেজ দিলে তা দেখাবে
        } else {
            report.steadfast = "কোনো পূর্ববর্তী রেকর্ড নেই";
        }
    } catch (err) {
        // রেন্ডার লগে আসল এরর মেসেজ দেখার জন্য
        console.error("Steadfast Detailed Error:", err.response ? err.response.data : err.message);
        report.steadfast = "চেক করা যায়নি বা রেকর্ড নেই";
    }

    res.json(report);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
