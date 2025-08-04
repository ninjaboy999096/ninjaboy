const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginButton = document.querySelector('.login-button');
const buttonText = document.querySelector('.button-text');
const loadingSpinner = document.querySelector('.loading-spinner');
const rememberMeInput = document.getElementById('rememberMe');

// Global variable to store all user data for searching
let allUserData = [];
let currentPermissions = [];
let currentPasswords = {};
let allPortData = {};
let refreshInterval = null; // Add global variable for refresh interval
let currentSearchQuery = ''; // Add global variable to store current search query

// Add WebSocket variables
let room = null;
let currentUser = null;
let lastCursorUpdate = 0;
let myUsername = '';

// Auto-fill saved credentials on load
window.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMeInput.checked = true;
    }
    if (savedPassword) {
        passwordInput.value = savedPassword;
    }
    // Trigger label animations for filled fields
    if (usernameInput.value) usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    if (passwordInput.value) passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    setLoading(true);
    hideError();
    
    try {
        const response = await fetch('https://e1x8.xyz/moderator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (response.status === 403) {
            // Invalid credentials - redirect to rickroll
            window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            // Successful login - handle the data
            console.log('Login successful:', data);
            
            // Save or clear credentials based on "Remember Me"
            if (rememberMeInput.checked) {
                localStorage.setItem('savedUsername', username);
                localStorage.setItem('savedPassword', password);
            } else {
                localStorage.removeItem('savedUsername');
                localStorage.removeItem('savedPassword');
            }
            
            // Show success message briefly then show dashboard
            showSuccessMessage();
            setTimeout(() => {
                showDashboard(data);
            }, 1000);
            
        } else {
            // Other error
            showError('An error occurred. Please try again.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection.');
    } finally {
        setLoading(false);
    }
});

function setLoading(loading) {
    if (loading) {
        loginButton.disabled = true;
        buttonText.style.opacity = '0.6';
        loadingSpinner.style.display = 'block';
    } else {
        loginButton.disabled = false;
        buttonText.style.opacity = '1';
        loadingSpinner.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showSuccessMessage() {
    showError('Access granted! Loading dashboard...');
    errorMessage.style.background = 'rgba(34, 197, 94, 0.1)';
    errorMessage.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    errorMessage.style.color = '#86efac';
}

async function showDashboard(data) {
    // Hide login card and show dashboard
    document.querySelector('.login-card').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Store permissions and passwords globally
    currentPermissions = data.permissions || [];
    currentPasswords = data.passwords || {};
    allPortData = data.PORT_MAP || {};
    
    // Store torture data globally for port map access
    window.tortureData = data.TORTURE || {};
    
    // Store the logged-in username
    myUsername = usernameInput.value;
    
    // Initialize WebsimSocket for collaboration
    initializeCollaboration();
    
    // Display permissions
    const permissionsDisplay = document.getElementById('permissionsDisplay');
    if (permissionsDisplay) {
        permissionsDisplay.textContent = `Permissions: ${currentPermissions.join(', ') || 'none'}`;
    }
    
    // Populate dashboard with data
    populateBannedDatabase(data.banned || [], data.ipBans || [], data.associate || {});
    populateDNBUsers(data.dnb || []);
    populateDNIPBUsers(data.dnipb || []);
    populatePortMap(data.PORT_MAP || {});
    populateSystemInfo(data);
    
    // Add admin forms if user has permissions
    addAdminForms(data);
    
    // Set up auto-refresh every 10 seconds
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(async () => {
        await refreshDashboard();
    }, 10000);
}

function populateBannedDatabase(banned, ipBans, associations) {
    const container = document.getElementById('bannedDatabase');
    
    // Create a comprehensive user database showing all users with their IP status
    const userData = [];
    
    // First, add all banned users (excluding anonymous)
    banned.filter(username => username.toLowerCase() !== 'anonymous').forEach(username => {
        const userIps = associations[username] || [];
        const ipsArray = Array.isArray(userIps) ? userIps : [userIps].filter(Boolean);
        userData.push({
            username: username,
            ips: ipsArray,
            isBanned: true
        });
    });
    
    // Then add users from associations who aren't banned but have IPs (excluding anonymous)
    Object.entries(associations).forEach(([username, userIps]) => {
        if (!banned.includes(username) && username.toLowerCase() !== 'anonymous') {
            const ipsArray = Array.isArray(userIps) ? userIps : [userIps].filter(Boolean);
            const hasBannedIp = ipsArray.some(ip => ipBans.includes(ip));
            
            // If user has banned IP, they count as banned (haven't logged on since)
            userData.push({
                username: username,
                ips: ipsArray,
                isBanned: hasBannedIp
            });
        }
    });
    
    // Store all user data globally for searching
    allUserData = userData;
    
    // Set up search functionality only if not already set up
    if (!document.getElementById('searchInput').hasEventListener) {
        setupSearch(ipBans);
        document.getElementById('searchInput').hasEventListener = true;
    }
    
    // Apply current search filter if one exists, otherwise show all data
    const filteredData = currentSearchQuery ? filterUserData(userData, currentSearchQuery, ipBans) : userData;
    renderUserData(filteredData, ipBans);
    
    // Update search results count if there's an active search
    if (currentSearchQuery) {
        const searchResultsCount = document.getElementById('searchResultsCount');
        if (searchResultsCount) {
            searchResultsCount.textContent = `${filteredData.length} result${filteredData.length !== 1 ? 's' : ''} found`;
        }
    }
}

function setupSearch(ipBans) {
    const searchInput = document.getElementById('searchInput');
    const searchResultsCount = document.getElementById('searchResultsCount');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        currentSearchQuery = query; // Store the current search query
        const filteredData = filterUserData(allUserData, query, ipBans);
        renderUserData(filteredData, ipBans);
        
        // Update results count
        if (query) {
            searchResultsCount.textContent = `${filteredData.length} result${filteredData.length !== 1 ? 's' : ''} found`;
        } else {
            searchResultsCount.textContent = '';
        }
    });
}

function filterUserData(userData, query, ipBans) {
    if (!query) return userData;
    
    return userData.filter(user => {
        const username = user.username.toLowerCase();
        const ips = user.ips.map(ip => ip.toLowerCase());
        
        // Special query filters
        if (query === '$banned') {
            return user.isBanned;
        }
        if (query === '$unbanned') {
            return !user.isBanned;
        }
        
        // Check for IP match
        const ipMatch = ips.some(ip => ip.includes(query));
        
        // Check for username match (partial)
        const usernameMatch = username.includes(query);
        
        return ipMatch || usernameMatch;
    });
}

function renderUserData(userData, ipBans) {
    const container = document.getElementById('bannedDatabase');
    
    if (userData.length === 0) {
        container.innerHTML = '<div class="ban-item">No user data available</div>';
        return;
    }
    
    container.innerHTML = userData.map(user => {
        const bannedIps = user.ips.filter(ip => ipBans.includes(ip));
        const cleanIps = user.ips.filter(ip => !ipBans.includes(ip));
        
        return `
            <div class="ban-item ${user.isBanned ? 'ban-user' : 'clean-user'}">
                <div class="ban-header">
                    <div class="ban-type">${user.isBanned ? '🚫 Banned User' : '✅ Clean User'}</div>
                    <div class="ban-username">${user.username}</div>
                    ${currentPermissions.includes('banned') ? `
                        <div class="ban-actions">
                            ${user.isBanned ? 
                                `<button class="action-btn unban-btn" onclick="removeBan('${user.username}')">Unban</button>` :
                                `<button class="action-btn ban-btn" onclick="banUser('${user.username}')">Ban</button>`
                            }
                            <button class="action-btn remove-btn" onclick="removeAssociation('${user.username}')">Remove Association</button>
                        </div>
                    ` : ''}
                </div>
                <div class="ban-details">
                    ${bannedIps.length > 0 ? `<div class="ban-ips banned-ips">🔴 Banned IPs: ${bannedIps.map(ip => 
                        currentPermissions.includes('banned') ? 
                        `${ip} <button class="mini-btn" onclick="removeIpBan('${ip}')">Unban IP</button>` : ip
                    ).join(', ')}</div>` : ''}
                    ${cleanIps.length > 0 ? `<div class="ban-ips clean-ips">🟢 Clean IPs: ${cleanIps.map(ip => 
                        currentPermissions.includes('banned') ? 
                        `${ip} <button class="mini-btn" onclick="banIp('${ip}')">Ban IP</button> <button class="mini-btn" onclick="removeIpFromUser('${user.username}', '${ip}')">Remove</button>` : ip
                    ).join(', ')}</div>` : ''}
                    ${user.ips.length === 0 ? '<div class="ban-ips no-ips">No associated IPs</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Restore search input value and results count if there was a search query
    if (currentSearchQuery) {
        const searchInput = document.getElementById('searchInput');
        const searchResultsCount = document.getElementById('searchResultsCount');
        if (searchInput) {
            searchInput.value = currentSearchQuery;
        }
        if (searchResultsCount) {
            searchResultsCount.textContent = `${userData.length} result${userData.length !== 1 ? 's' : ''} found`;
        }
    }
}

function populateDNBUsers(dnb) {
    const container = document.getElementById('dnbUsers');
    if (dnb.length === 0) {
        container.innerHTML = '<div class="data-item">No protected users</div>';
        return;
    }
    
    container.innerHTML = dnb.map(user => 
        `<div class="data-item">
            ${user}
            ${currentPermissions.includes('banned') ? `<button class="mini-btn remove-mini-btn" onclick="removeDnb('${user}')">Remove</button>` : ''}
        </div>`
    ).join('');
}

function populateDNIPBUsers(dnipb) {
    const container = document.getElementById('dnipbUsers');
    if (dnipb.length === 0) {
        container.innerHTML = '<div class="data-item">No protected IPs</div>';
        return;
    }
    
    container.innerHTML = dnipb.map(ip => 
        `<div class="data-item">
            ${ip}
            ${currentPermissions.includes('banned') ? `<button class="mini-btn remove-mini-btn" onclick="removeDnipb('${ip}')">Remove</button>` : ''}
        </div>`
    ).join('');
}

function populatePortMap(portMap) {
    const container = document.getElementById('portMap');
    const entries = Object.entries(portMap);
    
    if (entries.length === 0) {
        container.innerHTML = `
            <div class="port-item">No port mappings</div>
            ${currentPermissions.includes('ports') ? `
                <div style="margin-top: 16px;">
                    <button class="action-btn" onclick="showAddPortForm()" style="width: 100%;">+ ADD Port Mapping</button>
                </div>
            ` : ''}
        `;
        return;
    }
    
    container.innerHTML = entries.map(([path, config]) => `
        <div class="port-item">
            <div class="port-icon">
                ${config.icon ? `<img src="${config.icon}" width="24" height="24" alt="">` : '🔗'}
            </div>
            <div class="port-info">
                <div class="port-path">${path}</div>
                <div class="port-details">Port: ${config.port} | Name: ${config.name || 'Unknown'}</div>
                ${config.extras ? `<div class="port-extras">Extras: ${JSON.stringify(config.extras)}</div>` : ''}
            </div>
            <div class="port-actions">
                ${currentPermissions.includes('ports') ? `
                    <button class="mini-btn" onclick="editPortMap('${path}')">Edit</button>
                    <button class="mini-btn remove-mini-btn" onclick="removePortMap('${path}')">Remove</button>
                ` : ''}
                ${currentPermissions.includes('torture') ? `
                    <button class="mini-btn ${(window.tortureData && window.tortureData[path]) ? 'unban-btn' : 'ban-btn'}" onclick="toggleTorture('${path}')">
                        ${(window.tortureData && window.tortureData[path]) ? 'Disable' : 'Enable'} Torture
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('') + (currentPermissions.includes('ports') ? `
        <div style="margin-top: 16px;">
            <button class="action-btn" onclick="showAddPortForm()" style="width: 100%;">+ ADD Port Mapping</button>
        </div>
    ` : '');
}

function populateSystemInfo(data) {
    const container = document.getElementById('systemInfo');
    
    container.innerHTML = `
        <div class="info-item">
            <span class="info-label">Version</span>
            <span class="info-value ${currentPermissions.includes('version') ? 'clickable-version' : ''}" ${currentPermissions.includes('version') ? `onclick="editVersion(${data.ver || 0})"` : ''}>${data.ver || 'Unknown'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Total Banned Users</span>
            <span class="info-value">${(data.banned || []).length}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Total IP Bans</span>
            <span class="info-value">${(data.ipBans || []).length}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Port Mappings</span>
            <span class="info-value">${Object.keys(data.PORT_MAP || {}).length}</span>
        </div>
    `;
}

// Admin action functions
async function makeAdminRequest(postData) {
    try {
        const response = await fetch('https://e1x8.xyz/moderator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value,
                ...postData
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showDashboard(data);
            return data;
        } else {
            showError('Operation failed');
        }
    } catch (error) {
        console.error('Admin request error:', error);
        showError('Network error');
    }
}

function banUser(username) {
    makeAdminRequest({ banUsername: username });
}

function removeBan(username) {
    makeAdminRequest({ removeBan: username });
}

function banIp(ip) {
    makeAdminRequest({ banIp: ip });
}

function removeIpBan(ip) {
    makeAdminRequest({ removeIpBan: ip });
}

function removeAssociation(username) {
    makeAdminRequest({ removeAssociate: username });
}

function removeIpFromUser(username, ip) {
    makeAdminRequest({ removeIpFromUser: { username, ip } });
}

function addDnb(username) {
    makeAdminRequest({ addDnb: username });
}

function removeDnb(username) {
    makeAdminRequest({ removeDnb: username });
}

function addDnipb(ip) {
    makeAdminRequest({ addDnipb: ip });
}

function removeDnipb(ip) {
    makeAdminRequest({ removeDnipb: ip });
}

function removePortMap(path) {
    makeAdminRequest({ removePortMap: path });
}

function editPortMap(path) {
    // Get current port data from the displayed data
    const currentData = Object.entries(allPortData || {}).find(([p]) => p === path);
    if (currentData) {
        showPortEditor(path, currentData[1]);
    } else {
        showPortEditor(path, { port: 0, name: '', icon: '', extras: {} });
    }
}

function showPortEditor(path, portData) {
    const modal = document.createElement('div');
    modal.className = 'port-editor-modal';
    modal.innerHTML = `
        <div class="port-editor-content">
            <div class="port-editor-header">
                <h3>${path ? 'Edit' : 'Add'} Port Mapping</h3>
                <button class="close-btn" onclick="closePortEditor()">&times;</button>
            </div>
            <div class="port-editor-form">
                <div class="form-group-vertical">
                    <label>Path:</label>
                    <input type="text" id="editPortPath" value="${path}" ${path ? 'readonly' : ''} placeholder="/myapp">
                </div>
                <div class="form-group-vertical">
                    <label>Port:</label>
                    <input type="number" id="editPortNumber" value="${portData.port || 0}" placeholder="1234">
                </div>
                <div class="form-group-vertical">
                    <label>Name:</label>
                    <input type="text" id="editPortName" value="${portData.name || ''}" placeholder="My Application">
                </div>
                <div class="form-group-vertical">
                    <label>Icon URL:</label>
                    <input type="text" id="editPortIcon" value="${portData.icon || ''}" placeholder="https://example.com/icon.png">
                </div>
                <div class="form-group-vertical">
                    <label>Extras:</label>
                    <div id="extrasEditor" class="extras-editor"></div>
                    <button type="button" class="action-btn" onclick="addExtrasProperty()">+ Add Property</button>
                </div>
                <div class="form-actions">
                    <button class="action-btn" onclick="savePortMapping()">${path ? 'Update' : 'Create'}</button>
                    <button class="action-btn" onclick="closePortEditor()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize extras editor
    currentExtras = { ...portData.extras };
    renderExtrasEditor();
}

let currentExtras = {};

function renderExtrasEditor() {
    const container = document.getElementById('extrasEditor');
    if (!container) return;
    
    container.innerHTML = Object.entries(currentExtras).map(([key, value]) => {
        const type = typeof value;
        return `
            <div class="extras-property">
                <div class="property-header">
                    <input type="text" class="property-key" value="${key}" onchange="updateExtrasKey('${key}', this.value)">
                    <select class="property-type" onchange="updateExtrasType('${key}', this.value)">
                        <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="object" ${type === 'object' && value !== null ? 'selected' : ''}>Object</option>
                    </select>
                    <button class="mini-btn remove-mini-btn" onclick="removeExtrasProperty('${key}')">Remove</button>
                </div>
                <div class="property-value">
                    ${renderPropertyValue(key, value, type)}
                </div>
            </div>
        `;
    }).join('') + `
        <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
            <button type="button" class="mini-btn" onclick="addExtrasPreset('websocket')">+ Websocket</button>
            <button type="button" class="mini-btn" onclick="addExtrasPreset('ip')">+ IP</button>
            <button type="button" class="mini-btn" onclick="addExtrasPreset('path')">+ Path</button>
            <button type="button" class="mini-btn" onclick="addExtrasPreset('hidden')">+ Hidden</button>
            <button type="button" class="mini-btn" onclick="addExtrasPreset('password')">+ Password</button>
            <button type="button" class="action-btn" onclick="addExtrasProperty()">+ Custom Property</button>
        </div>
    `;
}

function addExtrasPreset(preset) {
    switch (preset) {
        case 'websocket':
            if (!currentExtras.hasOwnProperty('websocket')) {
                currentExtras['websocket'] = false;
            }
            if (!currentExtras.hasOwnProperty('path')) {
                currentExtras['path'] = '';
            }
            break;
        case 'ip':
            if (!currentExtras.hasOwnProperty('ip')) {
                currentExtras['ip'] = '';
            }
            break;
        case 'path':
            if (!currentExtras.hasOwnProperty('path')) {
                currentExtras['path'] = '';
            }
            if (!currentExtras.hasOwnProperty('websocket')) {
                currentExtras['websocket'] = true;
            }
            break;
        case 'hidden':
            if (!currentExtras.hasOwnProperty('hidden')) {
                currentExtras['hidden'] = false;
            }
            break;
        case 'password':
            if (!currentExtras.hasOwnProperty('password')) {
                currentExtras['password'] = '';
            }
            break;
    }
    renderExtrasEditor();
}

function renderPropertyValue(key, value, type) {
    switch (type) {
        case 'boolean':
            return `<input type="checkbox" ${value ? 'checked' : ''} onchange="updateExtrasValue('${key}', this.checked)">`;
        case 'number':
            return `<input type="number" value="${value}" onchange="updateExtrasValue('${key}', parseFloat(this.value) || 0)">`;
        case 'object':
            if (value && typeof value === 'object') {
                return `<div class="nested-object">
                    ${Object.entries(value).map(([nestedKey, nestedValue]) => `
                        <div class="nested-property">
                            <span>${nestedKey}:</span>
                            <input type="text" value="${JSON.stringify(nestedValue)}" onchange="updateNestedValue('${key}', '${nestedKey}', this.value)">
                            <button class="mini-btn remove-mini-btn" onclick="removeNestedProperty('${key}', '${nestedKey}')">×</button>
                        </div>
                    `).join('')}
                    <button class="mini-btn" onclick="addNestedProperty('${key}')">+ Add Property</button>
                </div>`;
            }
            return `<textarea onchange="updateExtrasValue('${key}', JSON.parse(this.value || '{}'))">${JSON.stringify(value, null, 2)}</textarea>`;
        default:
            return `<input type="text" value="${value}" onchange="updateExtrasValue('${key}', this.value)">`;
    }
}

function addExtrasProperty() {
    showCustomPrompt('Add Property', 'Enter property name:', 'text', '', (key) => {
        if (key && !currentExtras.hasOwnProperty(key)) {
            currentExtras[key] = '';
            renderExtrasEditor();
        }
    });
}

function removeExtrasProperty(key) {
    delete currentExtras[key];
    renderExtrasEditor();
}

function updateExtrasKey(oldKey, newKey) {
    if (newKey && newKey !== oldKey && !currentExtras.hasOwnProperty(newKey)) {
        currentExtras[newKey] = currentExtras[oldKey];
        delete currentExtras[oldKey];
        renderExtrasEditor();
    }
}

function updateExtrasType(key, newType) {
    const currentValue = currentExtras[key];
    switch (newType) {
        case 'boolean':
            currentExtras[key] = Boolean(currentValue);
            break;
        case 'number':
            currentExtras[key] = parseFloat(currentValue) || 0;
            break;
        case 'object':
            currentExtras[key] = typeof currentValue === 'object' ? currentValue : {};
            break;
        default:
            currentExtras[key] = String(currentValue);
    }
    renderExtrasEditor();
}

function updateExtrasValue(key, value) {
    currentExtras[key] = value;
}

function updateNestedValue(parentKey, nestedKey, value) {
    try {
        currentExtras[parentKey][nestedKey] = JSON.parse(value);
    } catch (e) {
        currentExtras[parentKey][nestedKey] = value;
    }
}

function addNestedProperty(parentKey) {
    showCustomPrompt('Add Nested Property', 'Enter property name:', 'text', '', (key) => {
        if (key) {
            if (!currentExtras[parentKey] || typeof currentExtras[parentKey] !== 'object') {
                currentExtras[parentKey] = {};
            }
            currentExtras[parentKey][key] = '';
            renderExtrasEditor();
        }
    });
}

function removeNestedProperty(parentKey, nestedKey) {
    delete currentExtras[parentKey][nestedKey];
    renderExtrasEditor();
}

function savePortMapping() {
    const path = document.getElementById('editPortPath').value;
    const port = parseInt(document.getElementById('editPortNumber').value);
    const name = document.getElementById('editPortName').value;
    const icon = document.getElementById('editPortIcon').value;
    
    if (!path || !name) {
        showError('Path and name are required');
        return;
    }
    
    makeAdminRequest({ 
        editPortMap: { path, port, name, icon, extras: currentExtras } 
    }).then(() => {
        closePortEditor();
    });
}

function closePortEditor() {
    const modal = document.querySelector('.port-editor-modal');
    if (modal) {
        modal.remove();
    }
}

function toggleTorture(path) {
    makeAdminRequest({ toggleTorture: path });
}

async function bulkRemoveAnyIP() {
    showCustomPrompt('Anti-bitch who wants to ban everyone', 'Enter IP address to remove all bans and associations for:', 'text', '', async (targetIP) => {
        if (!targetIP) {
            showError('Please enter an IP address');
            return;
        }
        
        // Find all users with this IP
        const usersWithTargetIP = allUserData.filter(user => 
            user.ips.includes(targetIP)
        );
        
        if (usersWithTargetIP.length === 0) {
            showError(`No users found with IP ${targetIP}`);
            return;
        }
        
        // Process each user
        for (const user of usersWithTargetIP) {
            try {
                // Remove ban if user is banned
                if (user.isBanned) {
                    await makeAdminRequest({ removeBan: user.username });
                }
                
                // Remove the specific IP from the user
                await makeAdminRequest({ 
                    removeIpFromUser: { 
                        username: user.username, 
                        ip: targetIP 
                    } 
                });
            } catch (error) {
                console.error(`Error processing user ${user.username}:`, error);
            }
        }
        
        // Also remove the IP ban itself if it exists
        try {
            await makeAdminRequest({ removeIpBan: targetIP });
        } catch (error) {
            console.error('Error removing IP ban:', error);
        }
        
        // Refresh dashboard to show changes
        await refreshDashboard();
    });
}

async function fullUnbanUser() {
    showCustomPrompt('Full Unban User', 'Enter username to fully unban (removes all their banned IPs and unbans user):', 'text', '', async (targetUsername) => {
        if (!targetUsername) {
            showError('Please enter a username');
            return;
        }
        
        // Find the user in our data
        const userWithTarget = allUserData.find(user => 
            user.username.toLowerCase() === targetUsername.toLowerCase()
        );
        
        if (!userWithTarget) {
            showError(`User ${targetUsername} not found in database`);
            return;
        }
        
        try {
            // Remove ban if user is banned
            if (userWithTarget.isBanned) {
                await makeAdminRequest({ removeBan: userWithTarget.username });
            }
            
            // Remove IP bans for all IPs associated with this user
            for (const ip of userWithTarget.ips) {
                try {
                    await makeAdminRequest({ removeIpBan: ip });
                } catch (error) {
                    console.error(`Error removing IP ban for ${ip}:`, error);
                }
            }
            
            // Refresh dashboard to show changes
            await refreshDashboard();
            
        } catch (error) {
            console.error(`Error fully unbanning user ${targetUsername}:`, error);
            showError(`Error fully unbanning user ${targetUsername}`);
        }
    });
}

function addAdminForms(data) {
    const dashboardContent = document.querySelector('.dashboard-content');
    
    // Remove existing admin form sections to prevent duplicates
    const existingAdminSections = dashboardContent.querySelectorAll('.section:nth-child(n+6)'); // Remove sections after the first 5 (which are the main data sections)
    existingAdminSections.forEach(section => section.remove());
    
    // Add admin forms based on permissions
    if (currentPermissions.includes('banned')) {
        dashboardContent.insertAdjacentHTML('beforeend', `
            <div class="section">
                <h3>Quick Actions</h3>
                <div class="admin-forms">
                    <div class="form-group">
                        <input type="text" id="banUsernameInput" placeholder="Username to ban">
                        <button onclick="banUser(document.getElementById('banUsernameInput').value)" class="action-btn ban-btn">Ban User</button>
                    </div>
                    <div class="form-group">
                        <input type="text" id="banIpInput" placeholder="IP to ban">
                        <button onclick="banIp(document.getElementById('banIpInput').value)" class="action-btn ban-btn">Ban IP</button>
                    </div>
                    <div class="form-group">
                        <input type="text" id="addDnbInput" placeholder="Username to protect">
                        <button onclick="addDnb(document.getElementById('addDnbInput').value)" class="action-btn">Add to DNB</button>
                    </div>
                    <div class="form-group">
                        <input type="text" id="addDnipbInput" placeholder="IP to protect">
                        <button onclick="addDnipb(document.getElementById('addDnipbInput').value)" class="action-btn">Add to DNIPB</button>
                    </div>
                    <div class="form-group" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px; margin-top: 12px;">
                        <button onclick="bulkRemoveAnyIP()" class="action-btn unban-btn" style="width: 100%;">Anti-bitch who wants to ban everyone</button>
                    </div>
                    <div class="form-group">
                        <button onclick="fullUnbanUser()" class="action-btn unban-btn" style="width: 100%;">Full Unban User</button>
                    </div>
                </div>
            </div>
        `);
    }
    
    if (currentPermissions.includes('users') && Object.keys(currentPasswords).length > 0) {
        dashboardContent.insertAdjacentHTML('beforeend', `
            <div class="section">
                <h3>User Management</h3>
                <div id="userManagement" class="user-management">
                    ${Object.entries(currentPasswords).map(([username, userData]) => `
                        <div class="user-item">
                            <div class="user-info">
                                <strong>${username}</strong>
                                <div class="user-permissions">Permissions: ${userData.permissions ? userData.permissions.join(', ') : 'none'}</div>
                                ${userData.extras ? `<div class="user-permissions" style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Extras: ${JSON.stringify(userData.extras)}</div>` : ''}
                            </div>
                            <button class="mini-btn" onclick="editUser('${username}')">Edit</button>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <input type="text" id="newUserInput" placeholder="New username">
                        <button onclick="addNewUser(document.getElementById('newUserInput').value)" class="action-btn">+ Add User</button>
                    </div>
                </div>
            </div>
        `);
    }
}

function editUser(username) {
    const userData = currentPasswords[username] || {};
    showUserEditor(username, userData);
}

function showUserEditor(username, userData) {
    const modal = document.createElement('div');
    modal.className = 'port-editor-modal';
    modal.innerHTML = `
        <div class="port-editor-content">
            <div class="port-editor-header">
                <h3>Edit User: ${username}</h3>
                <button class="close-btn" onclick="closeUserEditor()">&times;</button>
            </div>
            <div class="port-editor-form">
                <div class="form-group-vertical">
                    <label>Password:</label>
                    <input type="password" id="editUserPassword" value="${userData.password || ''}" placeholder="Enter new password (leave blank to keep current)">
                </div>
                <div class="form-group-vertical">
                    <label>Permissions (comma-separated):</label>
                    <input type="text" id="editUserPermissions" value="${userData.permissions ? userData.permissions.join(', ') : ''}" placeholder="banned, users, ports, version, torture">
                </div>
                <div class="form-group-vertical">
                    <label>Extras:</label>
                    <div id="userExtrasEditor" class="extras-editor"></div>
                    <button type="button" class="action-btn" onclick="addUserExtrasProperty()">+ Add Property</button>
                </div>
                <div class="form-actions">
                    <button class="action-btn" onclick="saveUserChanges('${username}')">Save Changes</button>
                    <button class="action-btn" onclick="closeUserEditor()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize user extras editor
    currentUserExtras = { ...userData.extras };
    renderUserExtrasEditor();
}

let currentUserExtras = {};

function renderUserExtrasEditor() {
    const container = document.getElementById('userExtrasEditor');
    if (!container) return;
    
    container.innerHTML = Object.entries(currentUserExtras).map(([key, value]) => {
        const type = typeof value;
        return `
            <div class="extras-property">
                <div class="property-header">
                    <input type="text" class="property-key" value="${key}" onchange="updateUserExtrasKey('${key}', this.value)">
                    <select class="property-type" onchange="updateUserExtrasType('${key}', this.value)">
                        <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="object" ${type === 'object' && value !== null ? 'selected' : ''}>Object</option>
                    </select>
                    <button class="mini-btn remove-mini-btn" onclick="removeUserExtrasProperty('${key}')">Remove</button>
                </div>
                <div class="property-value">
                    ${renderUserPropertyValue(key, value, type)}
                </div>
            </div>
        `;
    }).join('');
}

function renderUserPropertyValue(key, value, type) {
    switch (type) {
        case 'boolean':
            return `<input type="checkbox" ${value ? 'checked' : ''} onchange="updateUserExtrasValue('${key}', this.checked)">`;
        case 'number':
            return `<input type="number" value="${value}" onchange="updateUserExtrasValue('${key}', parseFloat(this.value) || 0)">`;
        case 'object':
            return `<textarea onchange="updateUserExtrasValue('${key}', JSON.parse(this.value || '{}'))">${JSON.stringify(value, null, 2)}</textarea>`;
        default:
            return `<input type="text" value="${value}" onchange="updateUserExtrasValue('${key}', this.value)">`;
    }
}

function addUserExtrasProperty() {
    showCustomPrompt('Add Property', 'Enter property name:', 'text', '', (key) => {
        if (key && !currentUserExtras.hasOwnProperty(key)) {
            currentUserExtras[key] = '';
            renderUserExtrasEditor();
        }
    });
}

function removeUserExtrasProperty(key) {
    delete currentUserExtras[key];
    renderUserExtrasEditor();
}

function updateUserExtrasKey(oldKey, newKey) {
    if (newKey && newKey !== oldKey && !currentUserExtras.hasOwnProperty(newKey)) {
        currentUserExtras[newKey] = currentUserExtras[oldKey];
        delete currentUserExtras[oldKey];
        renderUserExtrasEditor();
    }
}

function updateUserExtrasType(key, newType) {
    const currentValue = currentUserExtras[key];
    switch (newType) {
        case 'boolean':
            currentUserExtras[key] = Boolean(currentValue);
            break;
        case 'number':
            currentUserExtras[key] = parseFloat(currentValue) || 0;
            break;
        case 'object':
            currentUserExtras[key] = typeof currentValue === 'object' ? currentValue : {};
            break;
        default:
            currentUserExtras[key] = String(currentValue);
    }
    renderUserExtrasEditor();
}

function updateUserExtrasValue(key, value) {
    currentUserExtras[key] = value;
}

function saveUserChanges(username) {
    const password = document.getElementById('editUserPassword').value;
    const permissionsText = document.getElementById('editUserPermissions').value;
    const permissions = permissionsText.split(',').map(p => p.trim()).filter(p => p);
    
    const userData = {};
    
    if (password) {
        userData.password = password;
    }
    
    if (permissions.length > 0) {
        userData.permissions = permissions;
    }
    
    if (Object.keys(currentUserExtras).length > 0) {
        userData.extras = currentUserExtras;
    }
    
    if (Object.keys(userData).length === 0) {
        showError('No changes to save');
        return;
    }
    
    makeAdminRequest({ 
        passwords: { [username]: userData }
    }).then(() => {
        closeUserEditor();
    });
}

function addNewUser(username) {
    if (!username) {
        showError('Please enter a username');
        return;
    }
    
    if (currentPasswords[username]) {
        showError('User already exists');
        return;
    }
    
    showUserEditor(username, {});
    document.getElementById('newUserInput').value = '';
}

function closeUserEditor() {
    const modal = document.querySelector('.port-editor-modal');
    if (modal) {
        modal.remove();
    }
}

function editVersion(currentVersion) {
    showCustomPrompt('Change Version', `Current version: ${currentVersion}`, 'number', currentVersion, (newVersion) => {
        if (newVersion !== null && !isNaN(newVersion)) {
            makeAdminRequest({ setVersion: parseInt(newVersion) });
        }
    });
}

function showAddPortForm() {
    showPortEditor('', { port: 0, name: '', icon: '', extras: {} });
}

// Custom prompt modal function
function showCustomPrompt(title, message, inputType = 'text', defaultValue = '', callback) {
    const modal = document.createElement('div');
    modal.className = 'custom-prompt-modal';
    modal.innerHTML = `
        <div class="custom-prompt-content">
            <div class="custom-prompt-header">
                <h3>${title}</h3>
                <button class="close-btn" onclick="closeCustomPrompt()">&times;</button>
            </div>
            <div class="custom-prompt-body">
                <p class="custom-prompt-message">${message}</p>
                <input type="${inputType}" id="customPromptInput" value="${defaultValue}" class="custom-prompt-input" autofocus>
            </div>
            <div class="custom-prompt-actions">
                <button class="action-btn cancel-btn" onclick="closeCustomPrompt()">Cancel</button>
                <button class="action-btn confirm-btn" onclick="confirmCustomPrompt()">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store callback for later use
    modal.promptCallback = callback;
    
    // Focus the input
    const input = modal.querySelector('#customPromptInput');
    input.focus();
    input.select();
    
    // Handle enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmCustomPrompt();
        }
    });
    
    // Handle escape key
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCustomPrompt();
        }
    });
}

function closeCustomPrompt() {
    const modal = document.querySelector('.custom-prompt-modal');
    if (modal) {
        modal.remove();
    }
}

function confirmCustomPrompt() {
    const modal = document.querySelector('.custom-prompt-modal');
    if (modal) {
        const input = modal.querySelector('#customPromptInput');
        const value = input.value.trim();
        const callback = modal.promptCallback;
        
        closeCustomPrompt();
        
        if (callback) {
            callback(value || null);
        }
    }
}

// Add some interactive effects
usernameInput.addEventListener('input', () => hideError());
passwordInput.addEventListener('input', () => hideError());

// Add enter key support
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
    }
});

// Add logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Update logout functionality to disconnect collaboration
            if (room) {
                room.disconnect();
                room = null;
            }
            
            // Clear cursors
            const cursorsContainer = document.getElementById('cursorsContainer');
            if (cursorsContainer) {
                cursorsContainer.innerHTML = '';
            }
            
            // Clear saved credentials if user logs out
            localStorage.removeItem('savedUsername');
            localStorage.removeItem('savedPassword');
            
            // Hide dashboard and show login
            document.getElementById('dashboard').style.display = 'none';
            document.querySelector('.login-card').style.display = 'block';
            
            // Reset form
            form.reset();
            hideError();
        });
    }
});

// Add refresh function
async function refreshDashboard() {
    try {
        const response = await fetch('https://e1x8.xyz/moderator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update stored data
            currentPermissions = data.permissions || [];
            currentPasswords = data.passwords || {};
            allPortData = data.PORT_MAP || {};
            window.tortureData = data.TORTURE || {};
            
            // Update dashboard sections
            populateBannedDatabase(data.banned || [], data.ipBans || [], data.associate || {});
            populateDNBUsers(data.dnb || []);
            populateDNIPBUsers(data.dnipb || []);
            populatePortMap(data.PORT_MAP || {});
            populateSystemInfo(data);
            
            // Update admin forms
            addAdminForms(data);
        }
    } catch (error) {
        console.error('Refresh error:', error);
    }
}

// Make functions globally accessible
window.banUser = banUser;
window.removeBan = removeBan;
window.banIp = banIp;
window.removeIpBan = removeIpBan;
window.removeAssociation = removeAssociation;
window.removeIpFromUser = removeIpFromUser;
window.addDnb = addDnb;
window.removeDnb = removeDnb;
window.addDnipb = addDnipb;
window.removeDnipb = removeDnipb;
window.removePortMap = removePortMap;
window.editPortMap = editPortMap;
window.editVersion = editVersion;
window.showAddPortForm = showAddPortForm;
window.showPortEditor = showPortEditor;
window.addExtrasProperty = addExtrasProperty;
window.removeExtrasProperty = removeExtrasProperty;
window.updateExtrasKey = updateExtrasKey;
window.updateExtrasType = updateExtrasType;
window.updateExtrasValue = updateExtrasValue;
window.updateNestedValue = updateNestedValue;
window.addNestedProperty = addNestedProperty;
window.removeNestedProperty = removeNestedProperty;
window.savePortMapping = savePortMapping;
window.closePortEditor = closePortEditor;
window.showCustomPrompt = showCustomPrompt;
window.closeCustomPrompt = closeCustomPrompt;
window.confirmCustomPrompt = confirmCustomPrompt;
window.addExtrasPreset = addExtrasPreset;
window.toggleTorture = toggleTorture;
window.bulkRemoveAnyIP = bulkRemoveAnyIP;
window.editUser = editUser;
window.showUserEditor = showUserEditor;
window.addUserExtrasProperty = addUserExtrasProperty;
window.removeUserExtrasProperty = removeUserExtrasProperty;
window.updateUserExtrasKey = updateUserExtrasKey;
window.updateUserExtrasType = updateUserExtrasType;
window.updateUserExtrasValue = updateUserExtrasValue;
window.saveUserChanges = saveUserChanges;
window.addNewUser = addNewUser;
window.closeUserEditor = closeUserEditor;
window.fullUnbanUser = fullUnbanUser;

function initializeCollaboration() {
    // Initialize WebsimSocket
    room = new WebsimSocket();
    
    // Set up presence tracking
    setupPresenceTracking();
    
    // Set up chat functionality
    setupChat();
    
    // Track mouse movement for cursor sharing
    document.addEventListener('mousemove', throttle(handleMouseMove, 50));
}

function setupPresenceTracking() {
    // Subscribe to presence updates
    room.presence.subscribe((users) => {
        updateUserCursors(users);
    });
    
    // Update our presence
    room.presence.update({
        username: myUsername,
        cursorX: 0,
        cursorY: 0,
        timestamp: Date.now()
    });
}

function handleMouseMove(e) {
    const now = Date.now();
    if (now - lastCursorUpdate > 50) { // Throttle updates
        lastCursorUpdate = now;
        
        room.presence.update({
            username: myUsername,
            cursorX: e.clientX,
            cursorY: e.clientY,
            timestamp: now
        });
    }
}

function updateUserCursors(users) {
    const container = document.getElementById('cursorsContainer');
    
    // Clear existing cursors
    container.innerHTML = '';
    
    // Add cursors for other users
    users.forEach(user => {
        if (user.username !== myUsername && user.cursorX !== undefined) {
            const cursor = document.createElement('div');
            cursor.className = 'user-cursor';
            cursor.style.left = user.cursorX + 'px';
            cursor.style.top = user.cursorY + 'px';
            
            // Generate a color based on username
            const color = generateUserColor(user.username);
            
            cursor.innerHTML = `
                <div class="cursor-arrow" style="border-left-color: ${color};"></div>
                <div class="cursor-label" style="background-color: ${color};">${user.username}</div>
            `;
            
            container.appendChild(cursor);
        }
    });
}

function generateUserColor(username) {
    // Generate a consistent color for each username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function setupChat() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendChat');
    
    // Subscribe to chat messages
    room.collection('chat_message').subscribe((messages) => {
        displayChatMessages(messages.reverse()); // Reverse to show newest first
    });
    
    // Send message on button click
    sendButton.addEventListener('click', sendChatMessage);
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    try {
        await room.collection('chat_message').create({
            moderator_username: myUsername,
            message: message,
            timestamp: Date.now()
        });
        
        chatInput.value = '';
    } catch (error) {
        console.error('Error sending chat message:', error);
    }
}

function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = messages.map(msg => {
        const date = new Date(msg.created_at);
        const timeStr = date.toLocaleTimeString();
        
        return `
            <div class="chat-message">
                <div class="chat-message-username">
                    @${msg.username} <span class="chat-message-account">[logged in as ${msg.moderator_username}]</span>
                    <span style="float: right; font-size: 11px; color: rgba(255, 255, 255, 0.4);">${timeStr}</span>
                </div>
                <div class="chat-message-text">${escapeHtml(msg.message)}</div>
            </div>
        `;
    }).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}