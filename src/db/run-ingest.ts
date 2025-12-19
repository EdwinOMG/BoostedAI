import "dotenv/config";
import { ingestConversation } from "./conversations";
 

//test script
// run ingestconversation with a conversation input
async function main() {
  const res = await ingestConversation({
    model: "chatgpt",
    sourceType: "html_upload",
    sourceReference: "sample.html",
    storageType: "local",
    storageKey: "conversations/sample.html",
    contentHash: "test_hash",
    parserVersion: "v1"
  });

  console.log(res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
