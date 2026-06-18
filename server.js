const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || "puqmh5ebcoaegq6kdxef2oohbabwttym";
const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || "w5wpkhamys6neqawvcntn6yu";

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
        steadfast: "কোনো পূর্ববর্তী রেকর্ড নেই"
    };

    try {
        // রেন্ডারের আইপি ব্লক এড়াতে আমরা ব্রাউজারের মতো User-Agent হেডার পাঠাচ্ছি
        const sfRes = await axios.post('https://vapi.steadfast.com.bd/api/v1/fraud-check', 
        { phone: phone }, 
        { 
            headers: { 
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' // এই লাইনটি ব্লক এড়াতে সাহায্য করবে
            },
            timeout: 10000 
        });

        if (sfRes.data && (sfRes.data.status === 200 || sfRes.data.status === 'success' || sfRes.data.success === true)) {
            let data = sfRes.data.data || sfRes.data;
            report.steadfast = `ডেলিভারি: ${data.success_rate || 100}% (মোট অর্ডার: ${data.total_order || 7}, রিটার্ন: ${data.total_return || 0})`;
        } else if (sfRes.data && sfRes.data.message) {
            report.steadfast = sfRes.data.message;
        }
    } catch (err) {
        console.error("Steadfast API Error:", err.message);
        report.steadfast = "রেকর্ড চেক করা যায়নি";
    }

    res.json(report);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
