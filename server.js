const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Render-এর Environment Variables থেকে সিক্রেট কী নেওয়া হচ্ছে
const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || "puqmh5ebcoaegq6kdxef2oohbabwttym";
const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || "w5wpkhamys6neqawvcntn6yu";

app.get('/api/verify', async (req, res) => {
    let phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({ status: "error", message: "নম্বর দেওয়া হয়নি!" });
    }

    // নম্বরের ফরম্যাট ক্লিন করা
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
        steadfast: "কোনো পূর্ববর্তী রেকর্ড নেই",
        pathao: "কী সেট করা নেই",
        redx: "কী সেট করা নেই"
    };

    // ====================================================
    // 🚀 ১০০% ডাইনামিক স্টেডফাস্ট এপিআই কল (যেকোনো নম্বরের জন্য)
    // ====================================================
    try {
        // এখানে কোনো ফিক্সড নম্বর নেই, কাস্টমার যে নম্বর ইনপুট দেবে হুবহু সেই নম্বরের এপিআই স্ট্যাটিস্টিক্স কল হবে
        const sfRes = await axios.get(`https://vapi.steadfast.com.bd/api/v1/delivery-statistics/${phone}`, {
            headers: {
                'Api-Key': STEADFAST_API_KEY,
                'Secret-Key': STEADFAST_SECRET_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000 // ১০ সেকেন্ড টাইমআউট
        });

        // কুরিয়ার সার্ভার থেকে আসা রিয়াল ডাটা প্রসেস করা
        if (sfRes.data && sfRes.data.success) {
            let data = sfRes.data.statistics;
            if (data) {
                let delivered = data.delivered || 0;
                let cancelled = data.cancelled || 0;
                let total = delivered + cancelled;
                
                // সাকসেস রেট হিসাব করা
                let rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                
                if (total > 0) {
                    report.steadfast = `ডেলিভারি: ${rate}% (মোট: ${total}, রিটার্ন: ${cancelled})`;
                } else {
                    report.steadfast = "নতুন কাস্টমার (কোনো রেকর্ড নেই)";
                }
            }
        }
    } catch (err) {
        console.error("Steadfast API Real Error:", err.message);
        report.steadfast = "রেকর্ড চেক করা যায়নি বা এপিআই রেসপন্স নেই";
    }

    res.json(report);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
