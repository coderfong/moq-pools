const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    content = content.replace(/MOQPools/g, 'MOQPools');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${filePath}`);
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`✗ ${filePath}: ${err.message}`);
    return 0;
  }
}

function walkDir(dir, fileTypes = ['.tsx', '.ts', '.js', '.md']) {
  const excludeDirs = ['node_modules', '.next', '.git', 'prisma/generated'];
  let count = 0;
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.some(ex => filePath.includes(ex))) {
          count += walkDir(filePath, fileTypes);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (fileTypes.includes(ext)) {
          count += replaceInFile(filePath);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
  
  return count;
}

console.log('Replacing MOQPools with MOQPools...\n');
const count = walkDir(process.cwd());
console.log(`\n✅ Updated ${count} files`);
