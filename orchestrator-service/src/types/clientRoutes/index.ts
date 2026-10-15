import z from "zod";

export interface transactionInterface{
    payer_upi_id : string,
    payee_upi_id : string,
    amount: number,
    idempotency_key : string,
    idempotency_ttl : string,
    gateway_id : string
}

// vpa type check 

export const vpaSchema = z.string().min(3).max(50).refine( (vpa:string)=>{
   
    const parts = vpa.split("@");
    if( parts.length < 2 ) return (false);

    const [ local , handle ] = parts;

    if(!local || !handle) return false;

    const localRegex = /^[a-zA-Z0-9.-]+$/
    if(!localRegex.test(local)) return false;

    const handleRegex = /^[a-zA-z]+$/
    if(!handleRegex.test(handle)) return false;

    return true
}, {
  message: "Invalid VPA format. Must contain a valid local part, a single '@', and a valid bank/provider handle (e.g., user@handle)",
} )