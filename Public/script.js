// Global variables
let scrapedResults = []

// Function to start scraping
function startScraping() {
  console.log("Starting full scraping process...")

  const loadingDiv = document.getElementById("loading")
  const scrapeButton = document.getElementById("scrapeButton")
  const errorDiv = document.getElementById("errorMessage")
  const progressText = document.getElementById("progressText")

  // Show loading state
  loadingDiv.style.display = "block"
  scrapeButton.disabled = true
  errorDiv.style.display = "none"

  // Hide previous results
  document.getElementById("summaryCard").style.display = "none"
  document.getElementById("resultsCard").style.display = "none"

  // Update progress text
  progressText.textContent = "Scraping all subpages from popular searches..."

  fetch("/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      loadingDiv.style.display = "none"
      scrapeButton.disabled = false

      if (!data.success) {
        showError(data.error || "Scraping failed")
        return
      }

      // Store results
      scrapedResults = data.results || []

      // Update UI
      updateSummary(data.summary)
      displayResults(scrapedResults)

      console.log("Scraping completed successfully")
    })
    .catch((error) => {
      loadingDiv.style.display = "none"
      scrapeButton.disabled = false
      showError("An error occurred during scraping: " + error.message)
      console.error("Scraping error:", error)
    })
}

// Function to update summary
function updateSummary(summary) {
  document.getElementById("totalSubpages").textContent = summary.totalSubpages || 0
  document.getElementById("successfulPages").textContent = summary.successfulPages || 0
  document.getElementById("totalTexts").textContent = summary.totalTexts || 0

  const avgTexts = summary.successfulPages > 0 ? Math.round(summary.totalTexts / summary.successfulPages) : 0
  document.getElementById("averageTexts").textContent = avgTexts

  document.getElementById("summaryCard").style.display = "block"
}

// Function to display results
function displayResults(results) {
  const tableBody = document.getElementById("resultsTable")

  if (!results || results.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No results found</td></tr>'
    return
  }

  let html = ""

  results.forEach((result, index) => {
    const statusClass = result.error ? "text-danger" : "text-success"
    const statusText = result.error ? "Failed" : "Success"
    const statusIcon = result.error ? "❌" : "✅"

    html += `
      <tr>
        <td>
          <div>
            <strong class="category-title">${escapeHtml(result.category)}</strong>
            <br>
            <small class="text-muted">${result.url}</small>
          </div>
        </td>
        <td class="text-center">
          <span class="badge bg-primary fs-6">${result.count}</span>
        </td>
        <td class="text-center ${statusClass}">
          <span class="${result.error ? "error-indicator" : "success-indicator"}">${statusIcon}</span>
          <br>
          <small>${statusText}</small>
          ${result.error ? `<br><small class="text-danger">${escapeHtml(result.error)}</small>` : ""}
        </td>
        <td class="text-center">
          ${
            result.count > 0
              ? `<button class="btn btn-sm btn-outline-primary" onclick="showDetails(${index})">
                  <i class="bi bi-eye"></i> View Texts
                </button>`
              : '<span class="text-muted">No data</span>'
          }
        </td>
      </tr>
    `
  })

  tableBody.innerHTML = html
  document.getElementById("resultsCard").style.display = "block"
}

// Function to show category details
function showDetails(resultIndex) {
  const result = scrapedResults[resultIndex]
  if (!result || !result.texts) return

  const itemsWithLinks = result.texts.filter((item) => item.href && item.href.trim() !== "").length

  document.getElementById("modalTitle").innerHTML = `
    <i class="bi bi-list-ul"></i> ${escapeHtml(result.category)} 
    <small>(${result.count} texts, ${itemsWithLinks} with links)</small>
  `

  let content = `
    <div class="mb-4">
      <div class="alert alert-info border-0">
        <strong><i class="bi bi-info-circle"></i> Category Information:</strong><br>
        <strong>Category:</strong> ${escapeHtml(result.category)}<br>
        <strong>URL:</strong> <a href="${result.url}" target="_blank" class="keyword-link">${result.url}</a><br>
        <strong>Total Texts:</strong> ${result.count}<br>
        <strong>Texts with Links:</strong> ${itemsWithLinks}<br>
        <strong>Link Rate:</strong> ${result.count > 0 ? Math.round((itemsWithLinks / result.count) * 100) : 0}%<br>
        <strong>Selector Used:</strong> <code>.RnzMlSB3 > .MSA0SguZ > span.yb8FMcW3</code>
      </div>
    </div>
    
    <div class="mb-3">
      <h6><i class="bi bi-tags"></i> Keywords (Click to visit):</h6>
    </div>
    
    <div class="keyword-grid">
  `

  result.texts.forEach((item) => {
    const hasLink = item.href && item.href.trim() !== "" && item.href !== "undefined"
    const fullHref =
      hasLink && !item.href.startsWith("http") ? `https://elements.envato.com${item.href}` : item.href || ""

    if (hasLink) {
      content += `
        <a href="${fullHref}" target="_blank" class="keyword-tag keyword-tag-link" title="Click to visit: ${escapeHtml(item.text)}">
          <i class="bi bi-link-45deg"></i> ${escapeHtml(item.text)}
        </a>
      `
    } else {
      content += `
        <span class="keyword-tag keyword-tag-no-link" title="No link available">
          ${escapeHtml(item.text)}
        </span>
      `
    }
  })

  content += `
    </div>
    
    <div class="mt-4">
      <div class="alert alert-success border-0">
        <i class="bi bi-lightbulb"></i> 
        <strong>Extraction Complete!</strong> Keywords with <i class="bi bi-link-45deg"></i> icon are clickable and will open in new tab.
        <br><small class="text-muted">
          <i class="bi bi-link-45deg text-success"></i> = Has Link (${itemsWithLinks}) | 
          <span class="text-muted">No icon = No Link (${result.count - itemsWithLinks})</span>
        </small>
      </div>
    </div>
  `

  document.getElementById("modalContent").innerHTML = content

  const modal = new bootstrap.Modal(document.getElementById("detailModal"))
  modal.show()
}

// Function to filter results
function filterResults() {
  const searchText = document.getElementById("searchInput").value.toLowerCase()

  if (!scrapedResults || scrapedResults.length === 0) return

  const filteredResults = scrapedResults.filter(
    (result) => result.category.toLowerCase().includes(searchText) || result.url.toLowerCase().includes(searchText),
  )

  displayResults(filteredResults)
}

// Function to export as CSV
function exportCSV() {
  window.open("/export-csv", "_blank")
}

// Function to export as JSON
function exportJSON() {
  window.open("/export-json", "_blank")
}

// Function to show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage")
  const errorText = document.getElementById("errorText")
  errorText.textContent = message
  errorDiv.style.display = "block"

  // Auto hide error after 10 seconds
  setTimeout(() => {
    errorDiv.style.display = "none"
  }, 10000)
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 Initializing Envato Elements Text Scraper...")

  // Check for cached data
  fetch("/cached-data")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Server connection failed")
      }
      return response.json()
    })
    .then((data) => {
      console.log("✅ Server connection successful")

      if (data.results && data.results.length > 0) {
        scrapedResults = data.results
        updateSummary(data.summary)
        displayResults(scrapedResults)
        console.log(`✅ Loaded ${data.summary.totalSubpages} categories from cache`)
      } else {
        console.log("ℹ️ No cached data available")
      }
    })
    .catch((error) => {
      console.error("❌ Error connecting to server:", error)
      // Don't show error for cached data, as it's not critical
    })

  console.log("✅ App initialization complete")
})
