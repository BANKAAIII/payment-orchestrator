import { Hono } from "hono";
import { pool } from "../config/db.js";
const walletRoutes = new Hono();
walletRoutes.post('/verifyUpiIds', async (c) => {
    try {
        const body = await c.req.json();
        const { upi_ids } = body;
        if (!Array.isArray(upi_ids) || upi_ids.length === 0) {
            return c.json("minimum 2 upi id's are required to verify them in wallet-db ", 400);
        }
        const query = `
            SELECT upi_id , status , balance
            FROM wallet
            WHERE upi_id = ANY($1::text[])
        `;
        const result = await pool.query(query, [upi_ids]);
        return c.json({
            success: true,
            wallets: result.rows
        }, 200);
    }
    catch (err) {
        console.error('Error during wallet batch verification:', err);
        return c.json({ error: err }, 500);
    }
});
export default walletRoutes;
