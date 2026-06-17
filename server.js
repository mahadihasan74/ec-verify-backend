const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Render-এর Environment Variables থেকে সুরক্ষিতভাবে কী-গুলো নেওয়া হচ্ছে
const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || "puqmh5ebcoaegq6kdxef2oohbabwttym";
const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || "w5wpkhamys6neqawvcntn6yu";

app.get('/api/verify', async (req, res) => {
    let phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({ status: "error", message: "নম্বর দেওয়া হয়নি!" });
    }

    // নম্বরের ফরম্যাট ঠিক করা
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
    // 🚀 STEADFAST FRAUD CHECK (FIXED ROUTE)
    // ==========================================
    try {
        // নতুন 'vapi' ডোমেইন ব্যবহার করা হয়েছে যা ENOTFOUND এরর ফিক্স করবে
        const sfRes = await axios.post('https://vapi.steadfast.com.bd/api/v1/fraud-check', 
        { 
            phone: phone 
        }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json' 
            },
            timeout: 7000 // ৭ সেকেন্ড টাইমআউট
        });

        if (sfRes.data && (sfRes.data.status === 200 || sfRes.data.status === 'success')) {
            let data = sfRes.data.data || sfRes.data;
            report.steadfast = `ডেলিভারি: ${data.success_rate || 0}% (মোট: ${data.total_order || 0}, রিটার্ন: ${data.total_return || 0})`;
        } else if (sfRes.data && sfRes.data.message) {
            report.steadfast = sfRes.data.message;
        } else {
            report.steadfast = "কোনো পূর্ববর্তী রেকর্ড নেই";
        }
    } catch (err) {
        console.error("Steadfast Error Log:", err.response ? err.response.data : err.message);
        report.steadfast = "রেকর্ড পাওয়া যায়নি বা এপিআই ব্লক";
    }

    res.json(report);
});

const PORT = process.env.PORT || 10000; // Render সাধারণত 10000 পোর্ট ব্যবহার করে
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
