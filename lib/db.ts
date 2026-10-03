import { MongoClient, Collection } from "mongodb";

const g = globalThis as unknown as { _mongo?: Promise<MongoClient> };

function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return (g._mongo ??= new MongoClient(uri).connect());
}

let indexed = false;
async function db() {
  const d = (await client()).db();
  if (!indexed) {
    await d.collection("users").createIndex({ email: 1 }, { unique: true });
    await d.collection("tasks").createIndex({ userId: 1, date: 1 });
    await d.collection("pushSubs").createIndex({ endpoint: 1 }, { unique: true });
    await d.collection("pushSubs").createIndex({ userId: 1 });
    await d.collection("reminderLog").createIndex({ userId: 1, key: 1 }, { unique: true });
    await d.collection("reminderLog").createIndex({ createdAt: 1 }, { expireAfterSeconds: 14 * 86400 });
    indexed = true;
  }
  return d;
}

export async function users(): Promise<Collection<any>> {
  return (await db()).collection("users");
}
export async function tasks(): Promise<Collection<any>> {
  return (await db()).collection("tasks");
}
export async function pushSubs(): Promise<Collection<any>> {
  return (await db()).collection("pushSubs");
}
export async function reminderLog(): Promise<Collection<any>> {
  return (await db()).collection("reminderLog");
}
