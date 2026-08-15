const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

const startMain = html.indexOf('<main class="workday-main">');
const subviewAddStart = html.indexOf('<!-- SUBVIEW: ADD MEMBER & ORG WIZARD -->');
const subviewDirStart = html.indexOf('<!-- SUBVIEW: DIRECTORY -->');

const shellTop = html.substring(0, startMain + 27);
const topBar = html.substring(startMain + 27, html.indexOf('<!-- SUBVIEW: OVERVIEW -->'));

let addMemberContent = html.substring(subviewAddStart, subviewDirStart);
addMemberContent = addMemberContent.replace('id="subview-add" class="hidden"', 'id="subview-add"');

let addMemberTopBar = topBar.replace('id="tab-btn-overview"', 'id="btn-go-admin"');
addMemberTopBar = addMemberTopBar.replace('<button class="dash-tab-link active" id="btn-go-admin">📊 Overview</button>', '<button class="dash-tab-link" id="btn-go-admin" onclick="window.location.href=\'./admin.html\'">📊 Overview</button>');
addMemberTopBar = addMemberTopBar.replace('<button class="dash-tab-link" id="tab-btn-add">➕ Add Member / Org</button>', '<button class="dash-tab-link active" id="tab-btn-add">➕ Add Member / Org</button>');

let addMemberBottom = html.substring(html.lastIndexOf('</main>'));
addMemberBottom = addMemberBottom.replace('admin.js', 'add-member.js');

let addMemberHtml = shellTop + addMemberTopBar + '\n' + addMemberContent + addMemberBottom;
addMemberHtml = addMemberHtml.replace('<a href="./admin.html" class="workday-nav-item active" id="nav-item-admin">', '<a href="./admin.html" class="workday-nav-item" id="nav-item-admin">');

const navItemAdd = `      <li>\n        <a href="./add-member.html" class="workday-nav-item active" id="nav-item-add">\n          <span class="nav-icon">➕</span>\n          <span>Add Member</span>\n        </a>\n      </li>\n`;
addMemberHtml = addMemberHtml.replace('<li>\n        <a href="./payroll.html"', navItemAdd + '      <li>\n        <a href="./payroll.html"');

fs.writeFileSync('add-member.html', addMemberHtml);

let newAdminHtml = html.substring(0, subviewAddStart) + html.substring(subviewDirStart);

const navItemAddInactive = `      <li>\n        <a href="./add-member.html" class="workday-nav-item" id="nav-item-add">\n          <span class="nav-icon">➕</span>\n          <span>Add Member</span>\n        </a>\n      </li>\n`;
newAdminHtml = newAdminHtml.replace('<li>\n        <a href="./payroll.html"', navItemAddInactive + '      <li>\n        <a href="./payroll.html"');

newAdminHtml = newAdminHtml.replace('<button class="dash-tab-link" id="tab-btn-add">➕ Add Member / Org</button>', '<button class="dash-tab-link" id="tab-btn-add" onclick="window.location.href=\'./add-member.html\'">➕ Add Member / Org</button>');

fs.writeFileSync('admin.html', newAdminHtml);
console.log('HTML files created/updated.');

// Now for JS
let js = fs.readFileSync('admin.js', 'utf8');

const controllerStart = js.indexOf('  // =========================================================================\n  // DEPARTMENT-CENTRIC PROGRESSIVE DISCLOSURE FORM CONTROLLER');

let adminJs = js.substring(0, controllerStart);
// Add the final brace back
adminJs += '});\n';

let extractedJs = js.substring(controllerStart, js.lastIndexOf('});'));

let addMemberJs = `/**
 * TerraHire — Add Member / Org Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const store = window.TerraHireStore ? window.TerraHireStore.getStore() : null;
  if (!store) return;

  const currentUser = window.TerraHireStore.getCurrentUser();

  // Update sidebar admin label
  const sbName = document.getElementById("sidebar-user-name");
  const sbAvatar = document.getElementById("sidebar-user-avatar");
  const activeAdmin = window.TerraHireStore.getCurrentUser();
  if (sbName && activeAdmin) sbName.textContent = activeAdmin.fullName;
  if (sbAvatar && activeAdmin) sbAvatar.textContent = activeAdmin.fullName.charAt(0);

  // Sign out handler
  const logoutBtn = document.getElementById("btn-emp-logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.TerraHireStore.setCurrentUser(null);
      window.location.href = "./login.html";
    };
  }

${extractedJs}
});
`;

fs.writeFileSync('add-member.js', addMemberJs);
fs.writeFileSync('admin.js', adminJs);
console.log('JS files created/updated.');
