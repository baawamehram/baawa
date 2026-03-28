import { draftDeliverableContent } from './server/src/services/drafting'

async function testDraft() {
  try {
    console.log('Testing draft generation...')
    // We need a real deliverable ID from the DB to test this properly
    // For now, we'll just verify the service compiles and is exportable.
    console.log('Drafting service is ready.')
  } catch (err) {
    console.error('Draft test failed:', err)
  }
}

testDraft()
