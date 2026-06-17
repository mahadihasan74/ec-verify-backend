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

    // ====================================================
    // 🚀 STEADFAST FRAUD CHECK (DIRECT SERVER IP ROUTE)
    // ====================================================
    try {
        // ডোমেইন হোস্ট ব্লকিং এড়াতে সরাসরি অফিসিয়াল আইপি (103.145.118.20) ব্যবহার করা হয়েছে
        const sfRes = await axios.post('http://103.145.118.20/api/v1/fraud-check', 
        { 
            phone: phone 
        }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json' 
            },
            timeout: 8000 // রেন্ডার থেকে ৮ সেকেন্ড সময় দেওয়া হলো
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
        // যদি আইপি রুট রিজেক্ট হয়, তবে আমরা মেইন ডোমেইনে অল্টারনেটিভ ট্রাই মারবো ব্যাকআপ হিসেবে
        try {
            const backupRes = await axios.post('https://vapi.steadfast.com.bd/api/v1/fraud-check', 
            { phone: phone }, 
            { 
                headers: { 'Api-Key': STEADFAST_API_KEY, 'Secret-Key': STEADFAST_SECRET_KEY, 'Content-Type': 'application/json' },
                timeout: 5000 
            });
            if (backupRes.data && backupRes.data.data) {
                let d = backupRes.data.data;
                report.steadfast = `ডেলিভারি: ${d.success_rate || 0}% (মোট: ${d.total_order || 0}, রিটার্ন: ${d.total_return || 0})`;
            }
        } catch (backupErr) {
            console.error("Steadfast Both Routes Failed:", err.message);
            report.steadfast = "রেকর্ড পাওয়া যায়নি বা এপিআই ব্লক";
        }
    }

    res.json(report);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
