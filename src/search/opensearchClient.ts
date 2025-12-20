import { Client } from "@opensearch-project/opensearch";
// Creates os client for indexing
const node = process.env.OPENSEARCH_URL;
if (!node) throw new Error("OPENSEARCH URL is not set");
 // open search client 
export const osClient = new Client({
    node,
    auth: process.env.OPENSEARCH_USERNAME
    ? {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD ?? ""
    }
    : undefined
});