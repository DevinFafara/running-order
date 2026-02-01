/**
 * Utilitaires pour parser le CSV Google Sheets et le convertir en JSON
 */

/**
 * Parse une cellule CSV en gérant les guillemets et virgules
 */
function parseCSVCell(cell) {
  if (!cell) return '';
  
  // Si la cellule commence et finit par des guillemets, les retirer
  if (cell.startsWith('"') && cell.endsWith('"')) {
    // Retirer les guillemets extérieurs et dédoubler les guillemets internes
    return cell.slice(1, -1).replace(/""/g, '"');
  }
  
  return cell.trim();
}

/**
 * Parse une ligne CSV en gérant les cellules avec virgules et guillemets
 */
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Guillemet doublé = guillemet échappé
        current += '"';
        i++; // Ignorer le prochain guillemet
      } else {
        // Toggle état des guillemets
        inQuotes = !inQuotes;
        current += char;
      }
    } else if (char === ',' && !inQuotes) {
      // Virgule séparatrice (pas dans des guillemets)
      cells.push(parseCSVCell(current));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Ajouter la dernière cellule
  cells.push(parseCSVCell(current));
  
  return cells;
}

/**
 * Extrait le timestamp de modification de la première ligne du CSV
 */
export function extractTimestamp(csvData) {
  try {
    const lines = csvData.split('\n');
    if (lines.length < 1) {
      throw new Error('CSV vide');
    }
    
    const firstLine = parseCSVLine(lines[0]);
    
    // Format attendu: LASTMOD,2024-11-14T15:30:42Z
    if (firstLine[0] === 'LASTMOD' && firstLine[1]) {
      const timestamp = firstLine[1];
      console.log('🕐 Timestamp extrait:', timestamp);
      return timestamp;
    }
    
    throw new Error('Format de timestamp invalide');
  } catch (error) {
    console.error('❌ Erreur extraction timestamp:', error);
    return null;
  }
}

/**
 * Valide la structure du CSV Google Sheets
 */
export function validateCSVStructure(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 3) {
      throw new Error('CSV doit contenir au moins 3 lignes (timestamp + headers + 1 data)');
    }
    
    // Vérifier la première ligne (timestamp)
    const firstLine = parseCSVLine(lines[0]);
    if (firstLine[0] !== 'LASTMOD') {
      throw new Error('Première ligne doit commencer par LASTMOD');
    }
    
    // Vérifier les en-têtes (ligne 2)
    const headers = parseCSVLine(lines[1]);
    const requiredHeaders = ['id', 'GROUPE', 'DAY', 'SCENE'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`En-tête manquant: ${required}`);
      }
    }
    
    console.log('✅ Structure CSV validée');
    console.log('📊 En-têtes trouvés:', headers);
    console.log('📈 Nombre de lignes de données:', lines.length - 2);
    
    return true;
  } catch (error) {
    console.error('❌ Validation CSV échouée:', error);
    return false;
  }
}

/**
 * Convertit le CSV Google Sheets en format JSON
 */
export function parseCSVToJSON(csvData) {
  try {
    console.log('🔄 Début parsing CSV vers JSON...');
    
    // Validation de la structure
    if (!validateCSVStructure(csvData)) {
      throw new Error('Structure CSV invalide');
    }
    
    const lines = csvData.split('\n').filter(line => line.trim());
    
    // Ligne 1: LAST_MODIFIED (ignorer)
    // Ligne 2: En-têtes
    const headers = parseCSVLine(lines[1]);
    console.log('📋 En-têtes CSV:', headers);
    
    // Ligne 3+: Données
    const jsonData = [];
    
    for (let i = 2; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      
      // Ignorer les lignes vides ou incomplètes
      if (cells.length < headers.length || !cells[0]) {
        console.warn(`⚠️ Ligne ${i + 1} ignorée (incomplète):`, cells);
        continue;
      }
      
      // Créer un objet JSON pour cette ligne
      const rowObject = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        let value = cells[j] || '';
        
        // Conversion de types pour certains champs
        if (header === 'id') {
          value = parseInt(value, 10) || 0;
        } else if (value === 'null' || value === '') {
          value = null;
        }
        
        rowObject[header] = value;
      }
      
      jsonData.push(rowObject);
    }
    
    console.log('✅ Parsing CSV terminé');
    console.log('📊 Objets JSON créés:', jsonData.length);
    console.log('🔍 Premier objet:', jsonData[0]);
    
    return jsonData;
    
  } catch (error) {
    console.error('❌ Erreur lors du parsing CSV:', error);
    throw error;
  }
}

/**
 * Fonction utilitaire pour récupérer et parser le CSV en une seule fois
 */
export async function fetchAndParseGoogleSheetsCSV(url) {
  try {
    console.log('📥 Récupération CSV depuis Google Sheets...');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvData = await response.text();
    const timestamp = extractTimestamp(csvData);
    const jsonData = parseCSVToJSON(csvData);
    
    return {
      data: jsonData,
      timestamp,
      lastUpdate: Date.now()
    };
    
  } catch (error) {
    console.error('❌ Erreur fetchAndParseGoogleSheetsCSV:', error);
    throw error;
  }
}