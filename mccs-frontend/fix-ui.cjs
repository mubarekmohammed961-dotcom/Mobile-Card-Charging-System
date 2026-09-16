const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

// Text replacements — fix all duplicate/broken button labels and subtitles
const replacements = [
  // Duplicate button text
  [/Refresh Refresh/g, 'Refresh'],
  [/Edit Edit/g,       'Edit'],
  [/Save Save/g,       'Save'],
  [/Send Send/g,       'Send'],
  [/Del Delete/g,      'Delete'],
  [/Upload Staff CSV/g, 'Upload CSV'],
  [/Upload CSV/g,      'Upload CSV'],
  [/Save Update Department/g, 'Update Department'],
  [/Save Update User/g,       'Update User'],
  [/ Update$/g,               'Update'],
  [/"Save Save Profile"/g,    '"Save Profile"'],
  [/Save Save Profile/g,      'Save Profile'],
  [/Save Save Rule/g,         'Save Rule'],
  [/ Bulk Upload Staff/g,     'Bulk Upload Staff'],
  [/X Cancel/g,               'Cancel'],
  [/X Confirm Rejection/g,    'Confirm Rejection'],
  [/Confirm Rejection/g,      'Confirm Rejection'],
  [/X Reject/g,               'Reject'],
  [/X Rejected/g,             'Rejected'],
  [/ Approved/g,              'Approved'],
  [/ Create Delivery/g,       'Create Delivery'],
  [/ Create$/g,               'Create'],
  [/ Preview Distribution/g,  'Preview Distribution'],
  [/ Confirm & Allocate/g,    'Confirm & Allocate'],
  [/ Distribution History/g,  'Distribution History'],
  [/ Pending Allocations/g,   'Pending Allocations'],
  [/ My Card History/g,       'My Card History'],
  [/ My Profile/g,            'My Profile'],
  [/ Edit Profile/g,          'Edit Profile'],
  [/ Change Password/g,       'Change Password'],
  [/ System Configuration/g,  'System Configuration'],
  [/ Mark Card as Used/g,     'Mark Card as Used'],
  [/ Usage History/g,         'Usage History'],
  [/ Mark as USED/g,          'Mark as Used'],
  [/ Mark Used/g,             'Mark as Used'],
  [/ View PIN & Confirm/g,    'View PIN & Confirm'],
  [/ Acknowledge Receipt/g,   'Acknowledge Receipt'],
  [/ Already Confirmed/g,     'Already Confirmed'],
  [/ Approve Budget/g,        'Approve Budget'],
  [/ Dept. Head View/g,       'Dept. Head View'],
  [/ Admin View/g,            'Admin View'],
  [/ Mark all read/g,         'Mark all read'],
  [/ Notifications/g,         'Notifications'],
  [/ Export enabled/g,        'Export enabled'],
  [/X Export restricted/g,    'Export restricted'],
  [/FR-009–014: /g,           ''],
  [/FR-042, /g,               ''],
  [/FR-038–042: /g,           ''],

  // SRS references in subtitles
  [/FR-009–014: Staff profiles, eligibility quotas, bulk CSV upload/g,
   'Staff profiles, eligibility quotas, bulk CSV upload'],
  [/Auto-allocate cards to eligible staff with preview/g,
   'Auto-allocate cards to eligible staff with full preview'],
  [/Dept Head approves over-budget distributions/g,
   'Dept Head approves over-budget distributions (BR-004)'],
  [/Forensic audit trail — every action logged with timestamp & IP/g,
   'Full forensic audit trail — every action logged with timestamp & IP'],

  // Panel title prefixes that are empty strings
  [/panel-title">\s*<\/div>/g, 'panel-title"></div>'],

  // FR subtitle references
  [/Step 1: Select department  staff  month, then preview before confirming/g,
   'Step 1: Select department → staff → month, then preview'],
  [/Step 1: Select department → staff → month, then preview before confirming/g,
   'Step 1: Select department → staff → month, then preview'],

  // N prefix typo in password subtitle
  [/NPasswords are hashed with bcrypt/g,
   'Passwords are hashed with bcrypt'],

  // Orphaned single chars/symbols before labels
  [/"> Bulk Upload Staff/g, '">Bulk Upload Staff'],
  [/"> Upload Staff CSV/g,  '">Upload Staff CSV'],
  [/"> CSV Column Format/g, '">CSV Column Format'],
  [/"> Pending Allocations/g, '">Pending Allocations'],
  [/"> My Card History/g, '">My Card History'],
  [/"> My Profile/g, '">My Profile'],
  [/"> Edit Profile/g, '">Edit Profile'],
  [/"> Change Password/g, '">Change Password'],
  [/"> System Configuration/g, '">System Configuration'],
  [/"> System Info/g, '">System Info'],
  [/"> Mark Card as Used/g, '">Mark Card as Used'],
  [/"> Usage History/g, '">Usage History'],
  [/"> RBAC Permission Matrix/g, '">RBAC Permission Matrix'],
  [/"> Create New User/g, '">Create New User'],
  [/"> Reset Password/g, '">Reset Password'],
  [/"> Distribution History/g, '">Distribution History'],
  [/"> Create Delivery/g, '">Create Delivery'],
  [/"> Create Monthly Distribution/g, '">Create Monthly Distribution'],
  [/"> Test SMTP Connection/g, '">Test SMTP Connection'],
  [/"> Cron Expression Format/g, '">Cron Expression Format'],
  [/"> Security Notes/g, '">Security Notes'],
  [/"> Department Allocation/g, '">Department Allocation'],
  [/"> Delivery Pipeline/g, '">Delivery Pipeline'],
  [/"> Recent Activity/g, '">Recent Activity'],
  [/"> Monthly Distribution Trend/g, '">Monthly Distribution Trend'],
  [/"> Export Access by Role/g, '">Export Access by Role'],

  // Fix empty icon-wraps in KPI cards by removing them since they're empty strings
  // We'll handle this by making the icon wrap work with SVG icons instead

  // Fix send button
  [/\{sendingId === d\.id \? "…" : "Send Send"\}/g,
   '{sendingId === d.id ? "Sending…" : "Send"}'],

  // Fix refresh patterns in Topbar
  [/: "Refresh"\}/g, ': "Refresh"}'],
];

let totalFixed = 0;
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  Fixed:', file);
    totalFixed++;
  }
}

// Also fix components
const compDir = path.join(__dirname, 'src/components');
const compFiles = fs.readdirSync(compDir).filter(f => f.endsWith('.jsx'));
for (const file of compFiles) {
  const filePath = path.join(compDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  Fixed component:', file);
    totalFixed++;
  }
}

console.log(`\nDone. Fixed ${totalFixed} files.`);
