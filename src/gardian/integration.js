/**
 * API Guardian Integration Script
 *
 * This script connects the API Guardian CLI with the Visual Dashboard.
 * It runs the API comparison and then serves the dashboard with the results.
 */
const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

// Configuration
const OLD_SPEC = process.argv[2] || "swagger.json";
const NEW_SPEC = process.argv[3] || "new-swagger.json";
const REPORT_OUTPUT = "public/api-guardian-report.json";

console.log("API Guardian Visual Dashboard Integration");
console.log("----------------------------------------");
console.log(`Comparing: ${OLD_SPEC} → ${NEW_SPEC}`);

// Make sure the output directory exists
const outputDir = path.dirname(REPORT_OUTPUT);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Run API Guardian with JSON output
const guardianCommand = `node api-guardian-cli.js ${OLD_SPEC} ${NEW_SPEC} --output=${REPORT_OUTPUT} --format=json`;

console.log(`\nRunning: ${guardianCommand}`);

exec(guardianCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running API Guardian: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }

  console.log(stdout);
  console.log(`\nReport generated: ${REPORT_OUTPUT}`);

  // Modify the dashboard component to use the real report
  updateDashboardComponent();

  // Start the React app
  console.log("\nStarting the dashboard...");

  const reactApp = spawn("npm", ["start"], {
    stdio: "inherit",
    shell: true,
  });

  reactApp.on("error", (error) => {
    console.error(`Error starting dashboard: ${error.message}`);
  });
});

/**
 * Update the dashboard component to use the real report file
 */
function updateDashboardComponent() {
  const dashboardPath = path.join(__dirname, "src", "APIGuardianDashboard.js");

  if (!fs.existsSync(dashboardPath)) {
    console.warn(`Warning: Dashboard component not found at ${dashboardPath}`);
    return;
  }

  let content = fs.readFileSync(dashboardPath, "utf8");

  // Replace the sample data fetching with real file loading
  content = content.replace(
    /useEffect\(\s*\(\)\s*=>\s*{[\s\S]*?setTimeout[\s\S]*?}\s*,\s*\[\]\s*\);/,
    `useEffect(() => {
    // Load the report from the file generated by API Guardian
    fetch('/api-guardian-report.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load report. Make sure to run API Guardian first.');
        }
        return response.json();
      })
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  }, []);`
  );

  fs.writeFileSync(dashboardPath, content, "utf8");
  console.log("Dashboard component updated to use real report data");
}
