const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs").promises;
const path = require("path");

const BLOG_ID = process.env.BLOG_ID;

const notion = new Client({
  auth: process.env.API_TOKEN,
});

const n2m = new NotionToMarkdown({
  notionClient: notion,
});

const response = await notion.databases.query({
  database_id: BLOG_ID,
});

async function toMarkdown(pages) {
  const folderPath = "./zola/content";

  const content = await fs.readdir(folderPath);
  for (const file of content) {
    const filePath = `${folderPath}/${file}`;
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) continue;
    if (file === "_index.md") continue;

    await fs.unlink(filePath);
  }

  const postsPath = "./zola/content/posts";
  const posts = await fs.readdir(postsPath);
  for (const file of posts) {
    if (file === "_index.md") continue;
    const filePath = path.join(postsPath, file);
    await fs.unlink(filePath);
  }

  console.log("cleared all posts");

  for (const page of pages) {
    const pageId = page.id;

    const properties = page.properties;

    console.log(page, properties);

    const nameKey = Object.keys(properties).find(
      (key) => key.trim() === "Name",
    );
    const dateKey = Object.keys(properties).find(
      (key) => key.trim() === "Date",
    );
    const draftKey = Object.keys(properties).find(
      (key) => key.trim() === "Draft",
    );

    const draft = properties[draftKey].checkbox;

    if (draft) {
      continue;
    }

    let title = properties[nameKey].title[0].text.content;
    let splitDate = properties[dateKey].date.start.split("T");
    let date = splitDate[0];
    let length = splitDate[1];

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks);

    const snake_title = title
      .toLowerCase() // Convert to lowercase
      .replace(/[^\w\s]/g, "") // Remove punctuation (keep letters, numbers, and spaces)
      .replace(/\s+/g, "_"); // Replace spaces with underscores

    let cat = properties["Multi-select"].multi_select[0].name
      .toLowerCase() // Convert to lowercase
      .replace(/[^\w\s]/g, "") // Remove punctuation (keep letters, numbers, and spaces)
      .replace(/\s+/g, "_"); // Replace spaces with underscores
    let isPost = cat == "posts";
    let filePath = ""
    if (isPost) {
      filePath = `posts/${snake_title}.md`
    } else {
      filePath = `${cat}.md`
    }

    const content = `+++
title = "${title}"
date = ${date}
draft = ${draft}
${!isPost ? `template = "${cat}.html"` : ""}
[extra]
${length ? `length = ${length.split(":")[1]}` : ""}
+++
${mdString.parent}
`;
    try {
      await fs.writeFile(path.join(folderPath, filePath), content);
      console.log(`uploading ${snake_title}.md`);
    } catch (err) {
      console.error("err:", err);
    }
  }
}

toMarkdown(response.results);
