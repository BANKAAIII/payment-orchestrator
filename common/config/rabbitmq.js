export const BINDINGS = [
    {
        queue: { name: "DLQ" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "payments_exchange_Key" }
        ]
    },
    {
        queue: { name: "txn.initiation" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_initiation_rkey" }
        ]
    },
    {
        queue: { name: "txn.validation" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_validation_rKey" }
        ]
    },
    {
        queue: { name: "txn.processing" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_processing_Key" }
        ]
    },
    {
        queue: { name: "txn.ledgered" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_ledgered_Key" }
        ]
    },
    {
        queue: { name: "txn.failed" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_failed_Key" }
        ]
    },
    {
        queue: { name: "txn.complete" },
        exchanges: [
            { name: "payments_exchange", type: 'direct', routingKey: "txn_complete_Key" }
        ]
    }
];
