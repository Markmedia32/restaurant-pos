const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const datetime = require('node-datetime');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));




// ================= NEON POSTGRES CONNECTION =================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Neon PostgreSQL connection error:', err.message);
    } else {
        console.log('Connected to Neon PostgreSQL successfully.');
    }
});

// ✅ ADDED: LOCAL DATE FIX (IMPORTANT)
const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60000));
    return local.toISOString().split('T')[0];
};
// --- MPESA HELPERS ---
const generateToken = async (req, res, next) => {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');

    try {
        const { data } = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${auth}` } }
        );
        req.token = data.access_token;
        next();
    } catch (err) {
        console.error("Token Generation Error:", err.response?.data || err.message);
        res.status(500).json({ message: "Failed to generate M-Pesa token" });
    }
};

// --- ROUTES ---

// 1. Auth (Updated for Neon/Postgres)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Postgres uses $1, $2 instead of ? 
    const sql = `
        SELECT users.id, users.username, roles.role_name 
        FROM users 
        JOIN roles ON users.role_id = roles.id 
        WHERE users.username = $1 AND users.password = $2
    `;

    try {
        const results = await pool.query(sql, [username, password]);
        
        if (results.rows.length > 0) {
            res.json({
                success: true,
                user: { 
                    id: results.rows[0].id, 
                    username: results.rows[0].username, 
                    role: results.rows[0].role_name 
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, error: "Database connection failed" });
    }
});

// Get all users and their roles (Admin Only)
// Get all users (Admin Only)
app.get('/api/admin/users', (req, res) => {
    const role = req.headers['user-role']; 
    
    if (role !== 'Admin') {
        return res.status(403).json({ message: "Access Denied" });
    }

    const sql = `
        SELECT users.id, users.username, roles.role_name 
        FROM users 
        JOIN roles ON users.role_id = roles.id
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ================= TEST NEON =================
app.get('/api/test-neon', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            success: true,
            time: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new user (Admin Only)
app.post('/api/admin/create-user', (req, res) => {
    const { username, password, role_id } = req.body;
    const sql = "INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)";
    
    pool.query(sql, [username, password, role_id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: "User created!" });
    });
});

// Reset User Password
app.put('/api/admin/reset-password', (req, res) => {
    const { userId, newPassword } = req.body;
    const role = req.headers['user-role'];

    if (role !== 'Admin') return res.status(403).json("Unauthorized");

    const sql = "UPDATE users SET password = ? WHERE id = ?";
    pool.query(sql, [newPassword, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: "Password updated" });
    });
});

// Delete User
app.delete('/api/admin/delete-user/:id', (req, res) => {
    const userId = req.params.id;
    const role = req.headers['user-role'];

    if (role !== 'Admin') return res.status(403).json("Unauthorized");

    const sql = "DELETE FROM users WHERE id = ?";
    pool.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: "User removed" });
    });
});

// 2. Menu
app.get('/api/menu', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM menu_items");
        res.json(result.rows);
    } catch (err) {
        console.error("Menu Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM sales ORDER BY sale_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Sales Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. MPESA
app.post('/api/pay/stk', generateToken, async (req, res) => {
    const { phone, amount, clientName, items } = req.body;
    const shortCode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY;

    const dt = datetime.create();
    const timestamp = dt.format('YmdHMS');
    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    try {
        const { data } = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortCode,
                PhoneNumber: phone,
                CallBackURL: process.env.CALLBACK_URL,
                AccountReference: "FirstClassHotels",
                TransactionDesc: `Food for ${clientName}`
            },
            { headers: { Authorization: `Bearer ${req.token}` } }
        );

        console.log("STK Push Initiated:", data.CheckoutRequestID);

        const sql = `INSERT INTO sales (client_name, total_price, payment_status, mpesa_checkout_id, sale_date) VALUES (?, ?, 'Pending', ?, NOW())`;

        pool.query(sql, [clientName, amount, data.CheckoutRequestID], (err, result) => {
            if (err) {
                console.error("DB Insert Error:", err);
                return;
            }

            const saleId = result.insertId;
            console.log("Incoming Items:", items);

            const itemValues = items.map(item => {
                console.log("ITEM:", item);
                return [saleId, item.product_name, item.qty, item.price];
            });

            const itemSql = `INSERT INTO sales_items (sale_id, product_name, qty, price) VALUES ?`;

            pool.query(itemSql, [itemValues], (itemErr) => {
                if (itemErr) console.error("Item Insert Error:", itemErr);
                else console.log("Items inserted OK for sale:", saleId);
            });

            res.json(data);
        });

    } catch (err) {
        console.error("STK Error:", err.response?.data || err.message);
        res.status(500).json({ message: "STK Push Failed" });
    }
});

// ✅ ADD THE NEW POLLING ROUTE HERE
app.get('/api/check-payment/:checkoutID', (req, res) => {
    const { checkoutID } = req.params;
    const sql = "SELECT payment_status FROM sales WHERE mpesa_checkout_id = ?";
    
    pool.query(sql, [checkoutID], (err, results) => {
        if (err) {
            console.error("Status Check Error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: "Not Found" });
        }
        res.json({ status: results[0].payment_status });
    });
});

// ✅ RESTORED CASH ROUTE
app.post('/api/pay/cash', async (req, res) => {
    const { clientName, amount, items } = req.body;

    try {
        // 1. Insert the Sale
        const saleSql = "INSERT INTO sales (client_name, total_price, payment_status, sale_date) VALUES ($1, $2, 'Completed', NOW()) RETURNING id";
        const saleRes = await pool.query(saleSql, [clientName, amount]);
        const saleId = saleRes.rows[0].id;

        // 2. Bulk Insert Items (Postgres Syntax)
        // We build a query like: INSERT INTO sales_items (...) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
        const values = [];
        const placeholders = items.map((item, index) => {
            const offset = index * 4;
            values.push(saleId, item.product_name, item.qty, item.price);
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        }).join(",");

        const itemSql = `INSERT INTO sales_items (sale_id, product_name, qty, price) VALUES ${placeholders}`;
        await pool.query(itemSql, values);

        res.json({ success: true });
    } catch (err) {
        console.error("Cash Sale Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. CALLBACK
app.post('/api/callback', (req, res) => {
    console.log("MPESA CALLBACK RECEIVED:", JSON.stringify(req.body, null, 2));

    const callbackData = req.body.Body.stkCallback;
    const checkoutID = callbackData.CheckoutRequestID;
    const resultCode = callbackData.ResultCode;

    // Logic: 0 is Success. 1037 (Timeout), 1 (Cancelled), or others = Failed
    const finalStatus = (resultCode === 0) ? 'Completed' : 'Failed';

    pool.query(
        "UPDATE sales SET payment_status = ? WHERE mpesa_checkout_id = ?",
        [finalStatus, checkoutID],
        (err) => {
            if (err) console.error("Callback DB Error:", err);
            else console.log(`Payment marked as ${finalStatus}:`, checkoutID);
        }
    );

    res.json("Received");
});
// 5. SALES REPORT
app.get('/api/reports/sales-summary', async (req, res) => {
    const { date } = req.query;
    const selectedDate = date || getLocalDate();

    const sql = `
        SELECT 
            si.product_name, 
            SUM(si.qty) as total_qty, 
            MAX(si.price) as price,
            SUM(si.qty * si.price) as total_revenue
        FROM sales_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date::date = $1
        AND s.payment_status = 'Completed'
        GROUP BY si.product_name
        ORDER BY total_revenue DESC
    `;

    try {
        const result = await pool.query(sql, [selectedDate]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ================= 🔥 ADVANCED REPORTING ROUTES =================

app.get('/api/reports/advanced-summary', (req, res) => {
    const sql = `
        SELECT DATE(sale_date) as date, SUM(total_price) as total
        FROM sales
        WHERE payment_status = 'Completed'
        GROUP BY DATE(sale_date)
        ORDER BY date DESC
        LIMIT 30
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/reports/payment-breakdown', (req, res) => {
    const { date } = req.query;
    const sql = `
        SELECT payment_status, SUM(total_price) as total
        FROM sales
        WHERE DATE(sale_date) = ?
        GROUP BY payment_status
    `;
    pool.query(sql, [date], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/reports/top-items', (req, res) => {
    const { date } = req.query;
    const sql = `
        SELECT si.product_name, SUM(si.qty) as total_qty
        FROM sales_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.sale_date) = ?
        AND s.payment_status = 'Completed'
        GROUP BY si.product_name
        ORDER BY total_qty DESC
        LIMIT 5
    `;
    pool.query(sql, [date], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/reports/hourly-sales', (req, res) => {
    const { date } = req.query;
    const sql = `
        SELECT HOUR(s.sale_date) as hour, SUM(s.total_price) as total
        FROM sales s
        WHERE DATE(s.sale_date) = ?
        AND s.payment_status = 'Completed'
        GROUP BY hour
        ORDER BY hour
    `;
    pool.query(sql, [date], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/reports/monthly-cumulative', async (req, res) => {
    const { month } = req.query; // Format expected: '2026-04'
    const sql = `
        SELECT COALESCE(SUM(total_price), 0) as total_revenue 
        FROM sales 
        WHERE TO_CHAR(sale_date, 'YYYY-MM') = $1 
        AND payment_status = 'Completed'
    `;

    try {
        const result = await pool.query(sql, [month]);
        res.json({ total_revenue: parseFloat(result.rows[0].total_revenue) });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= 🛒 INVENTORY & AUDIT ROUTES =================

// --- WEEKLY INVENTORY LOGIC ---
app.get('/api/inventory', (req, res) => {
    // 1. Calculate the start of the current week (Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek));
    startOfWeek.setHours(0, 0, 0, 0);
    const formattedStart = startOfWeek.toISOString().split('T')[0];

    const sql = `
        SELECT 
            i.id, 
            i.item_name, 
            i.unit_measure, 
            i.opening_stock, 
            i.added_stock,
            COALESCE(SUM(si.qty / y.yield_per_unit), 0) as total_units_sold
        FROM inventory i
        LEFT JOIN yield_rules y ON i.item_name = y.material_name
        LEFT JOIN sales_items si ON y.menu_item_name = si.product_name
        LEFT JOIN sales s ON si.sale_id = s.id 
            AND s.payment_status = 'Completed' 
            AND s.sale_date >= ?
        GROUP BY i.id
    `;

    pool.query(sql, [formattedStart], (err, results) => {
        if (err) return res.status(500).json(err);
        
        const inventoryWithCalculations = results.map(item => {
            const opening = parseFloat(item.opening_stock);
            const added = parseFloat(item.added_stock);
            const sold = parseFloat(item.total_units_sold);
            const closingUnits = opening + added - sold;

            // --- UNIT DISPLAY LOGIC ---
            // Extract the number from "2kg Packet" or "50kg Bag"
            const weightMatch = item.unit_measure.match(/(\d+)/);
            const unitWeight = weightMatch ? parseInt(weightMatch[0]) : 1;

            let displayStock = "";
            let displayOpening = "";

            if (item.item_name.toLowerCase().includes("potato")) {
                // Show as: 7 (50kg each)
                displayStock = `${Math.floor(closingUnits)} (${item.unit_measure} each)`;
                displayOpening = `${opening} (${item.unit_measure})`;
            } else {
                // Show cumulative: 22 kg
                const totalKg = Math.floor(closingUnits * unitWeight);
                displayStock = `${totalKg} kg`;
                displayOpening = `${opening * unitWeight} kg`;
            }

            return {
                ...item,
                displayOpening,
                displayStock,
                stock_quantity: Math.floor(closingUnits),
                units_sold: Math.ceil(sold)
            };
        });

        res.json(inventoryWithCalculations);
    });
});
app.post('/api/inventory/add-stock', (req, res) => {
    const { item_id, quantity_to_add } = req.body;
    const sql = "UPDATE inventory SET stock_quantity = stock_quantity + ?, added_stock = added_stock + ? WHERE id = ?";
    pool.query(sql, [quantity_to_add, quantity_to_add, item_id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

app.post('/api/inventory/add-new', (req, res) => {
    const { item_name, unit_measure, stock_quantity } = req.body;
    const sql = "INSERT INTO inventory (item_name, unit_measure, stock_quantity, opening_stock) VALUES (?, ?, ?, ?)";
    pool.query(sql, [item_name, unit_measure, stock_quantity, stock_quantity], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// ✅ UPDATED: Precision Audit Logic
app.get('/api/inventory/audit-report', (req, res) => {
    const sql = `
        SELECT 
            i.item_name, i.unit_measure, i.stock_quantity, i.opening_stock, i.added_stock,
            y.menu_item_name, y.yield_per_unit,
            (SELECT COALESCE(SUM(si.qty), 0) 
             FROM sales_items si 
             JOIN sales s ON si.sale_id = s.id 
             WHERE si.product_name = y.menu_item_name 
             AND s.payment_status = 'Completed') as total_sold
        FROM inventory i
        LEFT JOIN yield_rules y ON i.item_name = y.material_name
    `;

    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);

        const groupedAudit = {};

        results.forEach(row => {
            if (!groupedAudit[row.item_name]) {
                groupedAudit[row.item_name] = {
                    name: row.item_name,
                    unit: row.unit_measure,
                    currentInStore: row.stock_quantity,
                    totalStartStore: parseFloat(row.opening_stock) + parseFloat(row.added_stock),
                    soldItems: []
                };
            }
            if (row.menu_item_name && row.total_sold > 0) {
                groupedAudit[row.item_name].soldItems.push({
                    name: row.menu_item_name,
                    qty: row.total_sold,
                    yield: row.yield_per_unit
                });
            }
        });

        const finalReport = Object.values(groupedAudit).map(mat => {
            let totalFractionalUsed = 0;
            let kitchenSummary = [];

            mat.soldItems.forEach(item => {
                const unitsUsed = item.qty / item.yield;
                totalFractionalUsed += unitsUsed;

                // Calculate how many portions are left in the currently "Open" bag/unit
                const fullUnitsOpened = Math.ceil(unitsUsed);
                const portionsLeft = (fullUnitsOpened * item.yield) - item.qty;
                
                kitchenSummary.push(`${portionsLeft} portions left from the opened ${mat.unit}`);
            });

            // CHANGE: We use Math.floor because if 0.04 of a bag is used, 
            // the store is missing 1 full bag (it's now in the kitchen).
            const exactRemaining = mat.totalStartStore - totalFractionalUsed;
            const wholeUnitsInStore = Math.floor(exactRemaining);
            
            let message = "";
            if (mat.soldItems.length > 0) {
                const soldDetails = mat.soldItems.map(si => `${si.qty} ${si.name}`).join(', ');
                message = `Sold: ${soldDetails}. You should have ${kitchenSummary.join(' and ')}. ` +
                          `The Store should have ${wholeUnitsInStore} full ${mat.unit} remaining.`;
            } else {
                message = `No sales recorded. Store should have ${mat.totalStartStore} ${mat.unit}.`;
            }

            return {
                item: mat.name,
                message: message,
                shouldBe: wholeUnitsInStore // Returns a whole number now
            };
        });

        res.json(finalReport);
    });
});

app.get('/', (req, res) => {
    res.send("POS API running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});