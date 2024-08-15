/**
 * download movie list from showtimebd.com
 */
import { $ } from "bun";
import { parseArgs} from "util"

interface UserInput {
    dir: string
    url: string
}

function parseUserInput() : UserInput {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
          d: {
            type: "string",
            default: ""
          },
          p: {
            type: "string",
            default: "",
          },
        },
        strict: true,
        allowPositionals: true,
      });
      
      let dir = values["d"]?.trim()
      if (dir!.length == 0) {
        dir = "./"
      }
     
      let url = values["p"]?.trim()
      if (url!.length == 0) {
        console.log(`usage: `)
        process.exit(1)
      }

      return {dir: dir!, url: url!}
}

async function getUrlContent(url: string) : Promise<string> {
    const response = await fetch(url)
    return await response.text()
}

async function getLinksForHtml(html: string) : Promise<string[]> {
    let listOfMovies: string[] = []
    const rewriter = new HTMLRewriter();

    rewriter.on("a", {
      element(el) {
        const href = el.getAttribute("href")
        if (!href?.startsWith("..")) {
            listOfMovies.push(href!)
        }
      }
    })

    rewriter.transform(new Response(html));
    return listOfMovies
}

function prepareListOfMovieURLs(baseURL: string, listOfMovies: string[]) : string[] {
    let newListOfMovies: string[] = []

    if (listOfMovies.length > 0) {
        for (let index in listOfMovies) {
            if (!listOfMovies[index].startsWith("/")) {
                let fullPath = baseURL
                if (!baseURL.endsWith("/"))
                    fullPath += "/"
                fullPath += listOfMovies[index]

                newListOfMovies.push(fullPath)
            }
        }
    }

    return newListOfMovies
}

async function downloadFileSequentially(baseOutDir: string, listOfMovies: string[]) : Promise<void> {
    if (listOfMovies.length > 0) {
        for (let movie of listOfMovies) {
            console.log("::", "=".repeat(20), "::")
            console.log("::", "Downloading >", movie)
            await $`(cd ${baseOutDir} && curl ${movie} -O --retry 999 --retry-max-time 0 -C -)`
        }
    }
}

const ui = parseUserInput()

console.log("Downloading from:", ui.url)
console.log("Saving to:", ui.dir)

const html = await getUrlContent(ui.url)

let lom = await getLinksForHtml(html)
lom = prepareListOfMovieURLs(ui.url, lom)

await downloadFileSequentially(ui.dir, lom)
