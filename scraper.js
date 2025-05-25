const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin())

// Daftar user-agent realistis
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
]

// Daftar subpage yang akan di-scrape (hardcoded)
const TARGET_SUBPAGES = [
  {
    category: "Graphic Templates",
    url: "https://elements.envato.com/popular-searches/graphic-templates",
  },
  {
    category: "Presentation Templates",
    url: "https://elements.envato.com/popular-searches/presentation-templates",
  },
  {
    category: "Graphics",
    url: "https://elements.envato.com/popular-searches/graphics",
  },
  {
    category: "Web Templates",
    url: "https://elements.envato.com/popular-searches/web-templates",
  },
  {
    category: "Add Ons",
    url: "https://elements.envato.com/popular-searches/add-ons",
  },
]

// Fungsi untuk setup browser Puppeteer
async function setupBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1920,1080",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-web-security",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  })

  const page = await browser.newPage()
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)]
  await page.setUserAgent(ua)

  page.setDefaultNavigationTimeout(90000)
  page.setDefaultTimeout(90000)

  await page.evaluateOnNewDocument(() => {
    delete navigator.__proto__.webdriver
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    })
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en", "id"],
    })
  })

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.google.com/",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  })

  return { browser, page }
}

// Fungsi untuk mengambil teks dari span.yb8FMcW3 di subhalaman
async function scrapeSubpageTexts(url, categoryName) {
  let browser

  try {
    console.log(`🔍 Scraping texts from: ${categoryName} (${url})`)

    const browserSetup = await setupBrowser()
    browser = browserSetup.browser
    const page = browserSetup.page

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Scroll to load dynamic content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Extract texts and links using the selector structure: class="RnzMlSB3" > class="MSA0SguZ" > span.yb8FMcW3
    const data = await page.evaluate(() => {
      const containerElements = document.querySelectorAll(".RnzMlSB3")
      const extractedData = []

      containerElements.forEach((container, index) => {
        // Look for the link element with class MSA0SguZ
        const linkElement = container.querySelector(".MSA0SguZ")

        if (linkElement) {
          // Get the href attribute
          const href = linkElement.getAttribute("href")

          // Look for the text element within the link
          const textElement = linkElement.querySelector("span.yb8FMcW3")

          if (textElement) {
            const text = textElement.textContent.trim()
            if (text) {
              extractedData.push({
                index: index + 1,
                text: text,
                href: href || "",
              })
            }
          }
        }
      })

      return extractedData
    })

    await browser.close()

    console.log(`✅ Found ${data.length} texts with links in ${categoryName}`)

    return data
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    console.error(`❌ Error scraping subpage ${categoryName}: ${error.message}`)
    return []
  }
}

// Fungsi utama untuk scraping data dari subpage yang ditentukan
async function scrapeAllData() {
  console.log(`🚀 Starting Envato Elements Scraper for specific categories...`)

  try {
    console.log(`📄 Target categories: ${TARGET_SUBPAGES.length}`)
    TARGET_SUBPAGES.forEach((subpage, index) => {
      console.log(`   ${index + 1}. ${subpage.category} -> ${subpage.url}`)
    })

    const allResults = []

    for (let i = 0; i < TARGET_SUBPAGES.length; i++) {
      const subpage = TARGET_SUBPAGES[i]
      console.log(`📄 Processing ${i + 1}/${TARGET_SUBPAGES.length}: ${subpage.category}`)

      try {
        // Add delay between requests to avoid being detected as bot
        if (i > 0) {
          const delay = 3000 + Math.random() * 2000 // 3-5 seconds delay
          console.log(`⏱️ Waiting ${Math.round(delay / 1000)} seconds...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const texts = await scrapeSubpageTexts(subpage.url, subpage.category)

        allResults.push({
          category: subpage.category,
          url: subpage.url,
          texts: texts,
          count: texts.length,
        })

        console.log(`✅ Extracted ${texts.length} texts with links from ${subpage.category}`)
      } catch (error) {
        console.error(`❌ Error processing ${subpage.category}: ${error.message}`)
        allResults.push({
          category: subpage.category,
          url: subpage.url,
          texts: [],
          count: 0,
          error: error.message,
        })
      }
    }

    console.log(`🎉 Scraping completed! Processed ${TARGET_SUBPAGES.length} categories`)

    // Calculate summary
    const totalTexts = allResults.reduce((sum, result) => sum + result.count, 0)
    const successfulPages = allResults.filter((result) => result.count > 0).length

    console.log(`📊 Summary:`)
    console.log(`   - Total categories: ${allResults.length}`)
    console.log(`   - Successful categories: ${successfulPages}`)
    console.log(`   - Total texts extracted: ${totalTexts}`)

    return {
      results: allResults,
      summary: {
        totalSubpages: allResults.length,
        successfulPages: successfulPages,
        totalTexts: totalTexts,
      },
    }
  } catch (error) {
    console.error(`❌ Error in main scraping process: ${error.message}`)
    throw error
  }
}

// Fungsi untuk mendapatkan daftar kategori target (untuk kompatibilitas)
function getTargetCategories() {
  return TARGET_SUBPAGES
}

module.exports = { scrapeAllData, getTargetCategories, scrapeSubpageTexts }
