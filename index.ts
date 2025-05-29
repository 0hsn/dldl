/**
 * download movie list from showtimebd.com
 */
import { parseArgs } from "jsr:@std/cli/parse-args";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { DOMParser, Element } from "jsr:@b-fuze/deno-dom";

interface UserInput {
  dir: string;
  url: string;
}

function parseUserInput(): UserInput {
  const values = parseArgs(
    Deno.args,
    {
      string: ["d", "p"],
      default: { d: "", p: "" },
    },
  );

  let dir = values.d?.trim();
  if (dir!.length == 0) {
    dir = "./";
  }

  const url = values.p?.trim();
  if (url!.length == 0) {
    console.log(`usage: -d <dir-to-save> -p <list-URL>`);
    Deno.exit(1);
  }

  return { dir, url };
}

async function getUrlContent(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

// async function getLinksForHtml(html: string): Promise<string[]> {
function getLinksForHtml(html: string): string[] {
  let listOfMovies: string[] = [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const p = doc.querySelectorAll("a")!;

  const forbiddenVals: Array<string> = [
    "Name",
    "Size",
    "Description",
    "Parent Directory",
    "Last modified",
  ];

  p.forEach((oneHref) => {
    if (forbiddenVals.indexOf(oneHref.innerHTML.trim()) === -1) {
      const href = oneHref.getAttribute("href");
      listOfMovies.push(href!);
    }
  });

  return listOfMovies;
}

function prepareListOfMovieURLs(
  baseURL: string,
  listOfMovies: string[],
): string[] {
  let newListOfMovies: string[] = [];

  if (listOfMovies.length > 0) {
    for (const index in listOfMovies) {
      if (!listOfMovies[index].startsWith("/")) {
        let fullPath = baseURL;
        if (!baseURL.endsWith("/")) fullPath += "/";
        fullPath += listOfMovies[index];

        newListOfMovies.push(fullPath);
      }
    }
  }

  return newListOfMovies;
}

async function downloadFileSequentially(
  baseOutDir: string,
  listOfMovies: string[],
): Promise<void> {
  if (listOfMovies.length > 0) {
    for (let movie of listOfMovies) {
      console.log("::", "=".repeat(20), "::");
      console.log("::", "Downloading >", movie);
      await $`(cd ${baseOutDir} && curl ${movie} -O --retry 999 --retry-max-time 0 -C -)`;
    }
  }
}

if (import.meta.main) {
  const ui = parseUserInput();
  await ensureDir(ui.dir);

  console.log("Downloading from:", ui.url);
  console.log("Saving to:", ui.dir);

  const html = await getUrlContent(ui.url);

  let lom = getLinksForHtml(html);
  lom = prepareListOfMovieURLs(ui.url, lom);
  console.table(lom);

  // await downloadFileSequentially(ui.dir, lom);
}
