
import z, { ZodType } from "zod";
import { vpaSchema } from "../../types/clientRoutes/index.js";
import { pool } from "../../config/db.js";
import axios from "axios"

// checks completed in the middleware 

// upiId authentication - internal lookup
// payload type verification ( done ) 
// idempotency keys and ttl checks ( done )
// rate limiting ( if possible )


const payloadType = z.object({
    payer_upi_id : z.string(),
    payee_upi_id : z.string(),
    amount:z.number(),
    gateway_id : z.string(),
    idempotency_key : z.string().optional(),
    idempotency_ttl : z.string().optional()
})

export async function payloadVerification(payload:any){

    // do type check for payload ( loose verification )
    const verifiedPayload  = payloadType.safeParse(payload);
    if (!verifiedPayload.success) {
            console.error("payload doesn't match ideal payload type", verifiedPayload.error);
            throw new Error("Invalid payload structure");
        }
    return verifiedPayload;
}

export async function vpaSyntaxVerification(payload:any): Promise<void>{
    // check the syntax or zod shape for the vpa to see if thats a valid vpa
    const {payer_upi_id , payee_upi_id} = payload.data;
    const payerVpaValid = vpaSchema.safeParse(payer_upi_id);
    const payeeVpaValid = vpaSchema.safeParse(payee_upi_id);

    if( !payeeVpaValid.success || !payerVpaValid.success) throw new Error("payer or payee id are not valid") 
    // add a graceful fail function?
}

export async function vpaDbCheck(payload:any):Promise<void>{
    const {payer_upi_id , payee_upi_id} = payload.data;
    const upi_ids : string[] = [payer_upi_id,payee_upi_id];

    try{
        // do a database call here
    const response = await axios.post("http://wallet:3003/upiVerification/verifyUpiIds",{
        "upi_ids":upi_ids
    })

    if(!response.data || !response.data.success){
       throw new Error("UPI verification failed from wallet service");
    }
    }catch(err:any){
        const errorMessage = err.response?.data?.error || err.message || "Wallet service communication failed";
        throw new Error(errorMessage);
    }
    

    
}

export async function txnInitMiddleware1( c:any , next: any ){

    const startTime = performance.now();

    const payload = await c.req.json();
    if(!payload) return new Error ("The payload is missing at txn.init's middleware 1 .");

    try {
        const verifiedPayload = await payloadVerification(payload); // done
        await vpaSyntaxVerification(verifiedPayload);   //done
        await vpaDbCheck(verifiedPayload);  //done

        console.log("middleware 1 successfully executed")

        const totalTime = performance.now() - startTime;
        console.log("Time taken to complete middleware1 : ",totalTime)

        return next();
    } catch (err: any) {
        return c.json({ error: err.message || "Validation failed" }, 400);
    }
}