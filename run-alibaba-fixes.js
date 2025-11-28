#!/usr/bin/env node

/**
 * Alibaba Listing Quality Fix - Batch Runner
 * 
 * This script automatically runs retry operations for all problematic categories:
 * 1. PARTIAL (1-9 attributes)
 * 2. BAD (0 attributes)
 * 3. MISSING (no detailJson)
 * 
 * Usage:
 *   node run-alibaba-fixes.js
 * 
 * The script will:
 * - Analyze current status
 * - Process each category sequentially
 * - Show progress and final summary
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CATEGORIES = ['PARTIAL', 'BAD', 'MISSING'];
const RETRY_SCRIPT = path.join(__dirname, 'retry-alibaba-problematic.js');

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${command} ${args.join(' ')}`);
    console.log('='.repeat(80) + '\n');
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAlibabaBatchFixes() {
  console.log('\n🚀 ALIBABA BATCH FIX RUNNER\n');
  console.log('This will process all problematic categories sequentially.');
  console.log('Make sure your dev server is running: pnpm run dev\n');
  console.log('Press Ctrl+C to stop at any time.\n');
  
  const startTime = Date.now();
  const results = {
    PARTIAL: { status: 'pending' },
    BAD: { status: 'pending' },
    MISSING: { status: 'pending' }
  };
  
  // First, run analysis
  try {
    console.log('📊 Running initial analysis...\n');
    await runCommand('node', ['analyze-alibaba-quality.js']);
  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
    return;
  }
  
  console.log('\n⏸️  Starting category fixes in 5 seconds...');
  console.log('   Press Ctrl+C now if you want to cancel.\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Process each category
  for (const category of CATEGORIES) {
    try {
      console.log(`\n${'█'.repeat(80)}`);
      console.log(`  Processing: ${category}`);
      console.log('█'.repeat(80));
      
      results[category].startTime = Date.now();
      
      await runCommand('node', [RETRY_SCRIPT, `--category=${category}`]);
      
      results[category].endTime = Date.now();
      results[category].status = 'completed';
      results[category].duration = ((results[category].endTime - results[category].startTime) / 1000 / 60).toFixed(1);
      
      console.log(`\n✅ ${category} completed in ${results[category].duration} minutes`);
      
      // Small break between categories
      if (CATEGORIES.indexOf(category) < CATEGORIES.length - 1) {
        console.log('\n⏸️  Waiting 10 seconds before next category...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
    } catch (err) {
      console.error(`\n❌ ${category} failed:`, err.message);
      results[category].status = 'failed';
      results[category].error = err.message;
      
      // Ask user if they want to continue
      console.log('\n⚠️  Do you want to continue with remaining categories? (continuing in 10s, Ctrl+C to stop)');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Final analysis
  console.log('\n\n' + '█'.repeat(80));
  console.log('  FINAL ANALYSIS');
  console.log('█'.repeat(80) + '\n');
  
  try {
    await runCommand('node', ['analyze-alibaba-quality.js']);
  } catch (err) {
    console.error('❌ Final analysis failed:', err.message);
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n\n' + '='.repeat(80));
  console.log('BATCH FIX SUMMARY');
  console.log('='.repeat(80));
  
  for (const category of CATEGORIES) {
    const result = results[category];
    const statusIcon = result.status === 'completed' ? '✅' : 
                       result.status === 'failed' ? '❌' : '⏭️';
    const duration = result.duration ? ` (${result.duration} min)` : '';
    
    console.log(`${statusIcon} ${category.padEnd(10)} ${result.status.toUpperCase()}${duration}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('─'.repeat(80));
  console.log(`⏱️  Total Runtime: ${totalTime} minutes`);
  console.log('='.repeat(80) + '\n');
  
  const allCompleted = Object.values(results).every(r => r.status === 'completed');
  
  if (allCompleted) {
    console.log('🎉 All categories processed successfully!\n');
  } else {
    console.log('⚠️  Some categories failed or were skipped.');
    console.log('   Re-run specific categories with:');
    console.log('   node retry-alibaba-problematic.js --category=CATEGORY\n');
  }
}

// Handle graceful shutdown
let isShuttingDown = false;
process.on('SIGINT', () => {
  if (isShuttingDown) {
    console.log('\n\n🛑 Force quit. Some progress may be lost.\n');
    process.exit(1);
  }
  
  console.log('\n\n⚠️  Shutdown requested. Waiting for current operation to finish...');
  console.log('   Press Ctrl+C again to force quit.\n');
  isShuttingDown = true;
});

// Run
runAlibabaBatchFixes().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
