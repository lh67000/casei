// ===== Chemins vers les dossiers =====
const SVG_DIR      = "../output/svg/";
const GIF_DIR      = "../output/gif/";
const PDF_DIR      = "../output/pdf/";
const CSV_DATA_DIR = "../output/csv/sigma/";
const CSV_META_DIR = "../output/csv/metadata/";
const CSV_FULL_DATASET = "../output/csv/dataset.csv";
const XLSX_LIST = "../output/xslx/database.xlsx";

let meta = [];   // liste des molécules (depuis liste_all.csv)
let df   = [];   // dataset global (pas utilisé pour le tableau, mais chargé)
let temp = [];   // données sigma de la molécule sélectionnée
let currentKey = null;


function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
  else console.warn(`#${id} introuvable`);
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
  else console.warn(`#${id} introuvable`);
}


function parseCSV(txt) {
  const lines = txt.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(";");
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] ?? "").trim());
    return obj;
  });
}


Promise.all([
  fetch("../output/csv/liste_all.csv").then(r => {
    if (!r.ok) throw new Error(`liste_all.csv : HTTP ${r.status}`);
    return r.text();
  }),
  fetch("../output/csv/dataset.csv").then(r => {
    if (!r.ok) throw new Error(`dataset.csv : HTTP ${r.status}`);
    return r.text();
  })
]).then(([metaTxt, dfTxt]) => {
  meta = parseCSV(metaTxt);
  df   = parseCSV(dfTxt);
  console.log(`Chargé ${meta.length} molécules, ${df.length} lignes de dataset`);
  buildList(meta);
}).catch(e => {
  console.error("Erreur de chargement :", e);
});

function buildList(meta) {
  const ul = document.getElementById("mol-list");
  if (!ul) return;
  ul.innerHTML = "";
  meta.forEach(m => {
    const li = document.createElement("li");
    const name    = m.complete_name    || "";
    const formula = m.formula || "";
    li.textContent = formula
      ? `${name} — ${formula}`
      : (name || m.name_formula || "(sans nom)");

    const key = m.name_formula || name || formula;
    li.dataset.key = key;
    li.onclick = () => selectMolecule(key, li);
    ul.appendChild(li);
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  if (!search) return;
  search.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#mol-list li").forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
});

async function selectMolecule(key, li) {
  currentKey = key;
  document.querySelectorAll("#mol-list li").forEach(el => el.classList.remove("active"));
  if (li) li.classList.add("active");

  // Nettoyage de la clé pour correspondre exactement aux noms de fichiers minuscules
// Met uniquement la première lettre en minuscule et laisse le reste intact
const cleanKey = key.charAt(0).toLowerCase() + key.slice(1);
const f = encodeURIComponent(cleanKey);

  const m = meta.find(x => x.name_formula === key);
  // ... le reste de votre code reste identique

  const molName = m ? ( m.complete_name + " " + m.formula || key) : key;
  setText("mol_title", molName);
  setText("mol-sigma", `${CSV_DATA_DIR}${f}.csv`);
  setText("mol-meta",  `${CSV_META_DIR}${f}.csv`);
  setAttr("plot", "src", `${SVG_DIR}${f}.svg`);
  setAttr("struc_gif", "src", `${GIF_DIR}${f}.gif`);
  // setAttr("link-svg",  "href", `${SVG_DIR}${f}.svg`);
  // setAttr("link-pdf",  "href", `${PDF_DIR}${f}.pdf`);
  // setAttr("full_dataset",  "href", `);

  const caption = `
    Download this plot
    <a href="${SVG_DIR}${f}.svg" download>[svg]</a>
    <a href="${PDF_DIR}${f}.pdf" download>[pdf]</a>
  `;
  document.getElementById("plot-caption").innerHTML = caption

  const caption_gif = `
  3D structure of the molecule. Animation made with <a target = "_blank" href= "https://xyzrender.readthedocs.io/en/latest/index.html">xyzrender</a>. Download this animation 
  <a href="${GIF_DIR}${f}.gif" download>[gif]</a>`;
document.getElementById("gif-caption").innerHTML = caption_gif;

  const mol_data =  `
    Download the dataset of this molecule 
    <a href="${CSV_DATA_DIR}${f}.csv" download>[csv]</a> <br>
        Download the full dataset of this website 
    <a href="${CSV_FULL_DATASET}" download>[csv]</a> <br>
    Download the list of the molecules of this database
    <a href="${XLSX_LIST}" download>[xlsx]</a>`;
   document.getElementById("DL_bouton").innerHTML = mol_data


const mol_meta =  `
    Calculated orbital caracteristcs of ${molName}.<br>
    The rows with <b> OCC = 0</b> represent virtual orbits, and thus aren't taken into account when calculating &sigma;.<br>
    The last row with  OCC &ne; 0 represents the HOMO (Higest Occupied Molecular Orbit) whereas the first one with OCC = 0 represents the LUMO (Lowest Unoccupied Molecular Orbit). <br>
    Download this table <a href="${CSV_META_DIR}${f}.csv" download>[csv]</a>`;
   document.getElementById("DL_pyscf").innerHTML = mol_meta
  // Charger le CSV sigma individuel
  try {
    const resp = await fetch(`${CSV_DATA_DIR}${f}.csv`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const txt = await resp.text();
    temp = parseCSV(txt);
  } catch (e) {
    console.error(`Impossible de charger ${f}.csv :`, e);
    temp = [];
  }

  // Construire le tableau
  let html = "<table><tr><th>T [eV]</th><th>σ [cm²]</th></tr>";
  temp.forEach(r => {
    html += `<tr><td>${r["T"] ?? "—"}</td><td>${r["sigma"] ?? "—"}</td></tr>`;
  });
  html += "</table>";

  const rendu = document.getElementById("rendu");
  if (rendu) rendu.innerHTML = html;
  // Ici je vais essayer de faire le tableau B C OCC mdr
try {
  const resp = await fetch(`${CSV_META_DIR}${f}.csv`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const txt = await resp.text();
  temp2 = parseCSV(txt);
} catch (e) {
  console.error(`Impossible de charger ${f}.csv :`, e);
  temp2 = [];
}

let html2 = "<table><tr><th>No Orbit</th><th>OCC</th><th>Orbital energy [eV]</th><th>Kinetic orbital energy [eV]</th></tr>";
temp2.forEach(r => {
  const occ = parseFloat(r["Occs"]);
  const cls = (occ === 0) ? ' class="virtual"' : '';
  html2 += `<tr${cls}><td>${r["no_orb"] ?? "—"}</td><td>${r["Occs"] ?? "—"}</td><td>${r["B"] ?? "—"}</td><td>${r["Kin_E"] ?? "—"}</td></tr>`;
});
html2 += "</table>";

const rendu2 = document.getElementById("rendu2");
if (rendu2) rendu2.innerHTML = html2;
}