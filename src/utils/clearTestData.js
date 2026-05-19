// One-shot helper: clears test condition data from localStorage.
// Run this in the browser console: `clearTestData()`
export default function clearTestData() {
  localStorage.removeItem('fallow:updatedConditions');
  localStorage.removeItem('fallow:resurfacedSeeds');
  localStorage.removeItem('fallow:conditions');
  localStorage.removeItem('fallow:conditionRevertDone');
  console.log('Test data cleared: conditions, updatedConditions, resurfacedSeeds, conditionRevertDone');
}
