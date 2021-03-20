process.env.NODE_ENV = "test";

const app = require("../app");
const db = require("../db");

const request = require("supertest");

beforeEach(async () => {
	await db.query("DELETE FROM books");

	await db.query(`
    INSERT INTO
      books (isbn, amazon_url,author,language,pages,publisher,title,year)
      VALUES(
        '123432122',
        'https://amazon.com/taco',
        'Elie',
        'English',
        100,
        'Nothing publishers',
        'my first book', 2008)
      RETURNING isbn`);
});

describe("Test Books routes", async () => {
	test("GET /books", async function () {
		const response = await request(app).get("/books");
		const { books } = response.body;
		expect(books).toHaveLength(1);
		expect(books[0]).toHaveProperty("isbn");
		expect(books[0]["author"]).toBe("Elie");
	});
	test("GET /books/:isbn", async function () {
		const response = await request(app).get("/books/123432122");
		expect(response.body.book.isbn).toBe("123432122");
	});
	test("GET /books/:isbn UNKNOWN isbn", async function () {
		const response = await request(app).get("/books/6tgb5hjrui8f");
		expect(response.statusCode).toBe(404);
	});
	test("POST /books", async function () {
		const response = await request(app).post("/books").send({
			isbn: "32794782",
			amazon_url: "https://taco.com",
			author: "mctest",
			language: "english",
			pages: 1000,
			publisher: "yeah right",
			title: "amazing times",
			year: 2000
		});
		expect(response.statusCode).toBe(201);
		expect(response.body.book).toHaveProperty("isbn");
	});
	test("POST /books INVALID post data", async function () {
		const response = await request(app).post("/books").send({ language: "english" });
		expect(response.statusCode).toBe(400);
	});
	test("PUT /books/:isbn", async function () {
		let isbn = "123432122";
		const response = await request(app).put(`/books/${isbn}`).send({
			amazon_url: "https://amazon.com/taco",
			author: "Elie",
			language: "french",
			pages: 100,
			publisher: "Nothing publishers",
			title: "my first book",
			year: 2021
		});
		expect(response.body.book.language).toBe("french");
	});
	test("PUT /:isbn INCOMPLETE put data", async function () {
		const response = await request(app).put("/books/123432122").send({ year: 2021 });
		expect(response.statusCode).toBe(400);
	});
	test("PUT /:isbn INVALID put data", async function () {
		const response = await request(app).put("/books/123432122").send({
			isbn: "123432122",
			amazon_url: "https://amazon.com/taco",
			author: "Elie",
			language: "french",
			pages: 100,
			publisher: "Nothing publishers",
			title: "my first book",
			year: 2021,
			EXTRA: "extra field"
		});
		expect(response.statusCode).toBe(400);
	});
	test("DELETE /:isbn", async function () {
		const response = await request(app).delete("/books/123432122");
		const resp = await request(app).get("/books");
		const { books } = resp.body;
		expect(books).toHaveLength(0);
	});
	test("DELETE /:isbn UNKNOWN isbn", async function () {
		const response = await request(app).delete("/books/67uybh890");
		expect(response.statusCode).toBe(404);
	});
});

afterAll(async () => {
	await db.end();
});
