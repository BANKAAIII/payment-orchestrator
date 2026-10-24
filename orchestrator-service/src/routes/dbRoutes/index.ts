import { Hono } from "hono";
import { pool } from "../../config/db.js";
import { txnStatusEnum } from "../../db/schema.js";
export const dbRoutes = new Hono();

type txnStatus = (typeof txnStatusEnum.enumValues)[number];

dbRoutes.post('/verifyIdempotencyFields' , async(c)=>{
    try{
       const body = await c.req.json();
        const { idempotency_key } = body;

        console.log(idempotency_key);
        if(!idempotency_key) return c.json("no idempotency key in dbRoute",400);

        const query = `
            SELECT id , payer_upi_id , payee_upi_id , amount , idempotency_ttl , idempotency_key , transaction_id , gateway_id , client_id , transaction_status , orchestrator_id
            FROM transactions
            WHERE idempotency_key = $1
            LIMIT 1
        `
        const result = await  pool.query(query,[idempotency_key]);

        if ( result.rows.length === 0  ){ 
            return c.json({
            success:false,
            exists:false,
            msg:`no transaction found for ${idempotency_key}`
        },200);
         }

        return c.json({
            success:true,
            exists:true,
            transaction:result.rows[0]
        },200);

    }catch(err:any){
        console.error(err);
        return c.json({error:err},500);
    }
});
