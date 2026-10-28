// Firestore security-rules tests (run with: cd tests && npm install && npm test). Needs Java 11+.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-treeline',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'posts/p1/comments/ok'), { name: 'Ana', text: 'Great post', status: 'approved', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'posts/p1/comments/wait'), { name: 'Bo', text: 'Pending one', status: 'pending', createdAt: Timestamp.now() });
  });
});
const anon = () => env.unauthenticatedContext().firestore();
const user = () => env.authenticatedContext('u1').firestore();
const admin = () => env.authenticatedContext('boss', { admin: true }).firestore();
const good = (o = {}) => ({ name: 'Visitor', text: 'Loved this.', status: 'approved', createdAt: serverTimestamp(), ...o });
const comments = db => collection(db, 'posts', 'p1', 'comments');

test('anyone can read an approved comment', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'posts/p1/comments/ok')));
});
test('public cannot read a pending comment', async () => {
  await assertFails(getDoc(doc(anon(), 'posts/p1/comments/wait')));
});
test('public query must filter to approved', async () => {
  await assertSucceeds(getDocs(query(comments(anon()), where('status', '==', 'approved'))));
  await assertFails(getDocs(comments(anon())));
});
test('admin can read pending comments', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'posts/p1/comments/wait')));
});
test('valid comment can be created (no login needed)', async () => {
  await assertSucceeds(addDoc(comments(anon()), good()));
  await assertSucceeds(addDoc(comments(user()), good()));
});
test('extra fields are rejected (hasOnly)', async () => {
  await assertFails(addDoc(comments(anon()), good({ isAdmin: true })));
  await assertFails(addDoc(comments(anon()), good({ html: '<b>x</b>' })));
});
test('missing fields are rejected', async () => {
  const { text, ...noText } = good();
  await assertFails(addDoc(comments(anon()), noText));
});
test('length and type limits are enforced', async () => {
  await assertFails(addDoc(comments(anon()), good({ text: 'x'.repeat(1001) })));
  await assertSucceeds(addDoc(comments(anon()), good({ text: 'x'.repeat(1000) })));
  await assertFails(addDoc(comments(anon()), good({ name: 'n'.repeat(41) })));
  await assertFails(addDoc(comments(anon()), good({ name: '' })));
  await assertFails(addDoc(comments(anon()), good({ text: 42 })));
});
test('createdAt must be the server time (no back-dating to jump the queue)', async () => {
  await assertFails(addDoc(comments(anon()), good({ createdAt: Timestamp.fromDate(new Date('2030-01-01')) })));
});
test('visitors cannot self-approve a different status', async () => {
  await assertFails(addDoc(comments(anon()), good({ status: 'hidden' })));
});
test('nobody but admin can edit or delete', async () => {
  await assertFails(updateDoc(doc(anon(), 'posts/p1/comments/ok'), { text: 'edited' }));
  await assertFails(updateDoc(doc(user(), 'posts/p1/comments/ok'), { status: 'hidden' }));
  await assertFails(deleteDoc(doc(user(), 'posts/p1/comments/ok')));
  await assertSucceeds(updateDoc(doc(admin(), 'posts/p1/comments/wait'), { status: 'approved' }));
  await assertFails(updateDoc(doc(admin(), 'posts/p1/comments/ok'), { text: 'admin rewrite' }));
  await assertSucceeds(deleteDoc(doc(admin(), 'posts/p1/comments/ok')));
});
test('bad post ids and other collections are closed', async () => {
  await assertFails(addDoc(collection(anon(), 'posts', 'BAD ID!', 'comments'), good()));
  await assertFails(setDoc(doc(anon(), 'posts/p1'), { title: 'hijack' }));
  await assertFails(getDoc(doc(anon(), 'secrets/x')));
});
