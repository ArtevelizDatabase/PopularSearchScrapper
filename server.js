console.log("🚀 Initializing Envato Elements Scraper server...")
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { scrapeAllData } = require("./scraper")

const app = express()
const PORT = 2000

// Konfigurasi middleware
app.use(cors())
app.use(bodyParser.json({ limit: "50mb" }))
app.use(express.static("public"))

// Variabel untuk menyimpan data di memori
let cachedResults = []

// Endpoint utama untuk scraping
app.post("/scrape", async (req, res) => {
  try {
    console.log(`🔍 Starting scraping process...`)

    const data = await scrapeAllData()

    // Simpan hasil ke cache
    cachedResults = data.results || []

    console.log(`✅ Scraping completed successfully`)

    res.json({
      success: true,
      results: data.results,
      summary: data.summary,
    })
  } catch (error) {
    console.error(`❌ Error in scraping: ${error.message}`)
    res.status(500).json({
      success: false,
      error: `Scraping failed: ${error.message}`,
    })
  }
})

// Endpoint untuk mendapatkan data yang sudah di-cache
app.get("/cached-data", (req, res) => {
  console.log("📂 GET /cached-data endpoint accessed")

  const totalTexts = cachedResults.reduce((sum, result) => sum + result.count, 0)
  const successfulPages = cachedResults.filter((result) => result.count > 0).length

  res.json({
    results: cachedResults || [],
    summary: {
      totalSubpages: cachedResults.length,
      successfulPages: successfulPages,
      totalTexts: totalTexts,
    },
  })
})

// Endpoint untuk export data sebagai CSV
app.get("/export-csv", (req, res) => {
  if (!cachedResults || cachedResults.length === 0) {
    return res.status(400).json({ error: "No data available for export" })
  }

  try {
    let csvContent = "Category,Index,Text,Link,URL\n"

    cachedResults.forEach((result) => {
      if (result.texts && result.texts.length > 0) {
        result.texts.forEach((item) => {
          // Escape commas and quotes in text
          const escapedText = `"${item.text.replace(/"/g, '""')}"`
          const fullHref =
            item.href && !item.href.startsWith("http") ? `https://elements.envato.com${item.href}` : item.href || ""
          csvContent += `"${result.category}",${item.index},${escapedText},"${fullHref}","${result.url}"\n`
        })
      }
    })

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", 'attachment; filename="envato-texts-data.csv"')
    res.send(csvContent)
  } catch (error) {
    console.error(`❌ Error exporting CSV: ${error.message}`)
    res.status(500).json({ error: `Export failed: ${error.message}` })
  }
})

// Endpoint untuk export data sebagai JSON
app.get("/export-json", (req, res) => {
  if (!cachedResults || cachedResults.length === 0) {
    return res.status(400).json({ error: "No data available for export" })
  }

  try {
    const totalTexts = cachedResults.reduce((sum, result) => sum + result.count, 0)
    const successfulPages = cachedResults.filter((result) => result.count > 0).length

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", 'attachment; filename="envato-texts-data.json"')
    res.json({
      exportDate: new Date().toISOString(),
      summary: {
        totalSubpages: cachedResults.length,
        successfulPages: successfulPages,
        totalTexts: totalTexts,
      },
      data: cachedResults,
    })
  } catch (error) {
    console.error(`❌ Error exporting JSON: ${error.message}`)
    res.status(500).json({ error: `Export failed: ${error.message}` })
  }
})

// Handle 404 untuk route yang tidak ditemukan
app.use((req, res) => {
  if (req.url.includes("/.well-known/appspecific/") || req.url.includes("/favicon.ico")) {
    return res.status(404).end()
  }

  console.error(`❌ Route not found: ${req.method} ${req.url}`)
  res.status(404).json({ error: "Endpoint not found" })
})

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`)
  console.log(`✅ Available endpoints:`)
  console.log(`   - POST /scrape`)
  console.log(`   - GET /cached-data`)
  console.log(`   - GET /export-csv`)
  console.log(`   - GET /export-json`)
})
