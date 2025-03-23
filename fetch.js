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
  const folderPath = "./zola/content/posts";
  const files = await fs.readdir(folderPath);

  for (const file of files) {
    if (file === "_index.md") continue;
    const filePath = path.join(folderPath, file);
    await fs.unlink(filePath);
  }

  console.log("cleared all posts");

  for (const page of pages) {
    const pageId = page.id;

    const properties = page.properties;

    const nameKey = Object.keys(properties).find(
      (key) => key.trim() === "Name",
    );
    const dateKey = Object.keys(properties).find(
      (key) => key.trim() === "Date",
    );
    const draftKey = Object.keys(properties).find(
      (key) => key.trim() === "Draft",
    );

    let title = properties[nameKey].title[0].text.content;
    let splitDate = properties[dateKey].date.start.split("T");
    let date = splitDate[0];
    let length = splitDate[1];
    const draft = properties[draftKey].checkbox;

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks);

    const content = `+++
title = "${title}"
date = ${date}
draft = ${draft}
[extra]
${length ? `\nlength = ${length.split(":")[1]}` : ""}
+++
${mdString.parent}
`;

    title = title
      .toLowerCase() // Convert to lowercase
      .replace(/[^\w\s]/g, "") // Remove punctuation (keep letters, numbers, and spaces)
      .replace(/\s+/g, "_"); // Replace spaces with underscores

    try {
      await fs.writeFile(path.join(folderPath, `${title}.md`), content);
      console.log(`uploading ${title}.md`);
    } catch (err) {
      console.error("err:", err);
    }
  }
}

toMarkdown(response.results);
