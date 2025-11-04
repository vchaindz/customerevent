// Admin Panel JavaScript
const ADMIN_PASSWORD = 'CN4ever.';
let isAuthenticated = false;
let profiles = {};
let currentEditProfile = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedAuth = sessionStorage.getItem('adminAuth');
    if (savedAuth === 'true') {
        showAdminPanel();
    }
    
    // Allow Enter key to submit password
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
});

// Login function
function login() {
    const password = document.getElementById('password').value;
    const statusEl = document.getElementById('loginStatus');
    
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('adminAuth', 'true');
        showAdminPanel();
    } else {
        statusEl.textContent = 'Invalid password';
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        document.getElementById('password').value = '';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

// Logout function
function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem('adminAuth');
    document.getElementById('adminContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('password').value = '';
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
    loadProfiles();
    updateStats();
    setInterval(updateStats, 5000); // Update stats every 5 seconds
}

// Load all profiles
async function loadProfiles() {
    try {
        // Load dynamic profiles from master list
        const MASTER_PROFILES_BIN = '68c8f57dd0ea881f407f7642';

        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${MASTER_PROFILES_BIN}/latest`, {
            headers: {
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load master profiles list');
        }

        const data = await response.json();
        const profilesList = data.record || { profiles: {}, mainProfile: 'tech' };

        // Merge with existing config
        Object.assign(APP_CONFIG.JSONBIN_BINS, profilesList.profiles);

        const profileSelect = document.getElementById('profileSelect');
        profileSelect.innerHTML = '<option value="">-- Select a profile --</option>';

        for (const profileName of Object.keys(APP_CONFIG.JSONBIN_BINS)) {
            const binId = APP_CONFIG.JSONBIN_BINS[profileName];
            if (binId) {
                const profileData = await loadProfileFromBackend(binId);
                if (profileData) {
                    profiles[profileName] = profileData;
                    const option = document.createElement('option');
                    option.value = profileName;
                    const isMain = profileName === profilesList.mainProfile ? ' ★' : '';
                    option.textContent = `${profileName}${isMain} (${profileData.items.length} items)`;
                    profileSelect.appendChild(option);
                }
            }
        }

        updateProfileList();
    } catch (error) {
        console.error('Failed to load profiles:', error);
        showStatus('Failed to load profiles', 'error');
    }
}

// Load profile data from backend
async function loadProfileFromBackend(binId) {
    try {
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.record;
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
    return null;
}

// Update profile in backend
async function updateProfileInBackend(binId, data) {
    try {
        data.lastUpdated = new Date().toISOString();
        
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });
        
        return response.ok;
    } catch (error) {
        console.error('Failed to update profile:', error);
        return false;
    }
}

// Create new profile
async function createProfile() {
    const name = document.getElementById('newProfileName').value.trim().toLowerCase();
    const description = document.getElementById('newProfileDesc').value.trim();
    const itemsText = document.getElementById('newProfileItems').value.trim();
    
    if (!name || !description || !itemsText) {
        showStatus('Please fill in all fields', 'error');
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(name)) {
        showStatus('Profile name can only contain lowercase letters, numbers, and hyphens', 'error');
        return;
    }
    
    if (APP_CONFIG.JSONBIN_BINS[name]) {
        showStatus('Profile already exists', 'error');
        return;
    }
    
    const items = itemsText.split('\n').map(item => item.trim()).filter(item => item);
    
    if (items.length < 2) {
        showStatus('Please add at least 2 voting items', 'error');
        return;
    }
    
    // Create profile data
    const profileData = {
        profile: name,
        description: description,
        items: items,
        votes: {},
        voters: {},
        lastUpdated: new Date().toISOString()
    };
    
    // Initialize votes
    items.forEach(item => {
        profileData.votes[item] = 0;
    });
    
    try {
        // Create bin in backend
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY,
                'X-Bin-Name': `voting-${name}`,
                'X-Bin-Private': false
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const data = await response.json();
            const binId = data.metadata.id;
            
            // Update local config
            APP_CONFIG.JSONBIN_BINS[name] = binId;
            profiles[name] = profileData;
            
            // Clear form
            document.getElementById('newProfileName').value = '';
            document.getElementById('newProfileDesc').value = '';
            document.getElementById('newProfileItems').value = '';
            
            // Store in master profiles list
            await updateMasterProfilesList(name, binId);
            
            showStatus(`Profile "${name}" created successfully! Access at: #${name}`, 'success');
            
            // Reload profiles
            loadProfiles();
        } else {
            throw new Error('Failed to create bin');
        }
    } catch (error) {
        console.error('Failed to create profile:', error);
        showStatus('Failed to create profile', 'error');
    }
}

// Update master profiles list
async function updateMasterProfilesList(name, binId, setAsMain = false) {
    const MASTER_PROFILES_BIN = '68c8f57dd0ea881f407f7642'; // Master profiles list bin
    
    try {
        // Get current profiles list
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${MASTER_PROFILES_BIN}/latest`, {
            headers: {
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY
            }
        });
        
        let profilesList = { profiles: {}, mainProfile: 'tech' };
        if (response.ok) {
            const data = await response.json();
            profilesList = data.record || { profiles: {}, mainProfile: 'tech' };
        }
        
        // Add new profile if binId provided
        if (binId) {
            profilesList.profiles[name] = binId;
        }
        
        // Set as main profile if requested
        if (setAsMain) {
            profilesList.mainProfile = name;
        }
        
        profilesList.lastUpdated = new Date().toISOString();
        
        // Update master list
        await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${MASTER_PROFILES_BIN}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY
            },
            body: JSON.stringify(profilesList)
        });
        
        // Update local config
        if (binId) {
            APP_CONFIG.JSONBIN_BINS[name] = binId;
        }
    } catch (error) {
        console.error('Failed to update master profiles list:', error);
    }
}

// Set profile as main
async function setAsMainProfile(profileName) {
    try {
        await updateMasterProfilesList(profileName, null, true);
        showStatus(`Profile "${profileName}" set as main profile! It will load by default on the homepage.`, 'success');
    } catch (error) {
        console.error('Failed to set main profile:', error);
        showStatus('Failed to set main profile', 'error');
    }
}

// Load profile data for editing
function loadProfileData() {
    const profileName = document.getElementById('profileSelect').value;
    if (!profileName || !profiles[profileName]) {
        document.getElementById('profileList').innerHTML = '';
        return;
    }
    
    const profile = profiles[profileName];
    const totalVotes = Object.values(profile.votes).reduce((a, b) => a + b, 0);
    const uniqueVoters = Object.keys(profile.voters || {}).length;
    
    const html = `
        <div class="profile-item">
            <div class="profile-info">
                <div class="profile-name">${profileName}</div>
                <div class="profile-stats">
                    ${profile.items.length} items • ${totalVotes} total votes • ${uniqueVoters} voters
                </div>
                <div class="profile-stats" style="margin-top: 5px;">
                    ${profile.description}
                </div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="editProfile('${profileName}')">✏️ Edit Topics</button>
            <button class="btn btn-danger" onclick="resetVotes('${profileName}')">🗑️ Reset Votes</button>
            <button class="btn btn-success" onclick="viewProfile('${profileName}')">👁️ View Live</button>
            <button class="btn btn-info" onclick="setAsMainProfile('${profileName}')">⭐ Set as Main</button>
            <button class="btn btn-warning" onclick="exportProfile('${profileName}')">💾 Export Data</button>
        </div>
    `;
    
    document.getElementById('profileList').innerHTML = html;
}

// Edit profile
function editProfile(profileName) {
    if (!profiles[profileName]) return;
    
    currentEditProfile = profileName;
    const profile = profiles[profileName];
    
    document.getElementById('editProfileName').textContent = profileName;
    document.getElementById('editDesc').value = profile.description;
    
    // Build items HTML
    const container = document.getElementById('editItemsContainer');
    container.innerHTML = '';
    
    profile.items.forEach((item, index) => {
        addEditItemElement(item, profile.votes[item] || 0);
    });
    
    document.getElementById('editModal').style.display = 'flex';
}

// Add item element in edit modal
function addEditItemElement(value = '', votes = 0) {
    const container = document.getElementById('editItemsContainer');
    const div = document.createElement('div');
    div.className = 'item-input-group';
    div.innerHTML = `
        <input type="text" value="${value}" placeholder="Item name">
        <span style="min-width: 60px; color: #666;">${votes} votes</span>
        <button class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

// Add new item in edit modal
function addEditItem() {
    addEditItemElement('', 0);
}

// Save profile edits
async function saveProfileEdits() {
    if (!currentEditProfile || !profiles[currentEditProfile]) return;
    
    const profile = profiles[currentEditProfile];
    const binId = APP_CONFIG.JSONBIN_BINS[currentEditProfile];
    
    if (!binId) {
        showStatus('Profile configuration not found', 'error');
        return;
    }
    
    // Get new values
    const newDesc = document.getElementById('editDesc').value.trim();
    const itemInputs = document.querySelectorAll('#editItemsContainer input[type="text"]');
    const newItems = Array.from(itemInputs)
        .map(input => input.value.trim())
        .filter(item => item);
    
    if (newItems.length < 2) {
        showStatus('Please keep at least 2 items', 'error');
        return;
    }
    
    // Update profile data
    const oldItems = profile.items;
    profile.description = newDesc;
    profile.items = newItems;
    
    // Update votes object (preserve existing votes, add new items with 0 votes)
    const newVotes = {};
    newItems.forEach(item => {
        newVotes[item] = profile.votes[item] || 0;
    });
    profile.votes = newVotes;
    
    // Update voters (remove votes for deleted items)
    const newVoters = {};
    for (const [voter, item] of Object.entries(profile.voters || {})) {
        if (newItems.includes(item)) {
            newVoters[voter] = item;
        }
    }
    profile.voters = newVoters;
    
    // Save to backend
    const success = await updateProfileInBackend(binId, profile);
    
    if (success) {
        showStatus('Profile updated successfully!', 'success');
        closeEditModal();
        loadProfiles();
    } else {
        showStatus('Failed to update profile', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditProfile = null;
}

// Reset votes for a profile
async function resetVotes(profileName) {
    if (!confirm(`Are you sure you want to reset all votes for "${profileName}"? This cannot be undone.`)) {
        return;
    }
    
    const profile = profiles[profileName];
    const binId = APP_CONFIG.JSONBIN_BINS[profileName];
    
    if (!profile || !binId) {
        showStatus('Profile not found', 'error');
        return;
    }
    
    // Reset all votes to 0
    profile.items.forEach(item => {
        profile.votes[item] = 0;
    });
    profile.voters = {};
    
    // Save to backend
    const success = await updateProfileInBackend(binId, profile);
    
    if (success) {
        showStatus(`All votes for "${profileName}" have been reset`, 'success');
        loadProfiles();
        updateStats();
    } else {
        showStatus('Failed to reset votes', 'error');
    }
}

// View profile
function viewProfile(profileName) {
    // Use hash route for GitHub Pages compatibility
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    window.open(`${baseUrl}#${profileName}`, '_blank');
}

// Export profile data
function exportProfile(profileName) {
    const profile = profiles[profileName];
    if (!profile) return;
    
    const exportData = {
        profile: profileName,
        description: profile.description,
        items: profile.items,
        votes: profile.votes,
        totalVotes: Object.values(profile.votes).reduce((a, b) => a + b, 0),
        uniqueVoters: Object.keys(profile.voters || {}).length,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voting-${profileName}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus(`Profile "${profileName}" exported`, 'success');
}

// Export all data
function exportData() {
    const exportData = {
        profiles: profiles,
        config: APP_CONFIG.JSONBIN_BINS,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voting-all-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('All data exported', 'success');
}

// Refresh all profiles
async function refreshProfiles() {
    showStatus('Refreshing profiles...', 'info');
    await loadProfiles();
    showStatus('Profiles refreshed', 'success');
}

// Show reset all modal
function showResetAllModal() {
    if (!confirm('Are you sure you want to reset ALL votes for ALL profiles? This cannot be undone!')) {
        return;
    }
    
    if (!confirm('This will delete all voting data. Are you REALLY sure?')) {
        return;
    }
    
    resetAllVotes();
}

// Reset all votes
async function resetAllVotes() {
    let successCount = 0;
    let failCount = 0;
    
    for (const [profileName, profile] of Object.entries(profiles)) {
        const binId = APP_CONFIG.JSONBIN_BINS[profileName];
        if (!binId) continue;
        
        // Reset votes
        profile.items.forEach(item => {
            profile.votes[item] = 0;
        });
        profile.voters = {};
        
        // Save to backend
        const success = await updateProfileInBackend(binId, profile);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    if (failCount === 0) {
        showStatus(`All votes reset successfully (${successCount} profiles)`, 'success');
    } else {
        showStatus(`Reset completed: ${successCount} successful, ${failCount} failed`, 'warning');
    }
    
    loadProfiles();
    updateStats();
}

// Update statistics
function updateStats() {
    if (!isAuthenticated) return;
    
    let totalProfiles = Object.keys(profiles).length;
    let totalVotes = 0;
    let totalVoters = 0;
    let totalItems = 0;
    
    for (const profile of Object.values(profiles)) {
        totalVotes += Object.values(profile.votes).reduce((a, b) => a + b, 0);
        totalVoters += Object.keys(profile.voters || {}).length;
        totalItems += profile.items.length;
    }
    
    const html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong>Total Profiles:</strong> ${totalProfiles}
            </div>
            <div>
                <strong>Total Items:</strong> ${totalItems}
            </div>
            <div>
                <strong>Total Votes:</strong> ${totalVotes}
            </div>
            <div>
                <strong>Unique Voters:</strong> ${totalVoters}
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Most Active Profile:</strong> ${getMostActiveProfile()}
        </div>
    `;
    
    document.getElementById('statsContainer').innerHTML = html;
}

// Get most active profile
function getMostActiveProfile() {
    let maxVotes = 0;
    let mostActive = 'None';
    
    for (const [name, profile] of Object.entries(profiles)) {
        const votes = Object.values(profile.votes).reduce((a, b) => a + b, 0);
        if (votes > maxVotes) {
            maxVotes = votes;
            mostActive = `${name} (${votes} votes)`;
        }
    }
    
    return mostActive;
}

// View detailed statistics
function viewStats() {
    const modal = document.getElementById('statsModal');
    const container = document.getElementById('detailedStats');
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    for (const [name, profile] of Object.entries(profiles)) {
        const totalVotes = Object.values(profile.votes).reduce((a, b) => a + b, 0);
        const uniqueVoters = Object.keys(profile.voters || {}).length;
        
        // Sort items by votes
        const sortedItems = profile.items
            .map(item => ({ item, votes: profile.votes[item] || 0 }))
            .sort((a, b) => b.votes - a.votes);
        
        html += `
            <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                <h3 style="color: #667eea; margin-bottom: 10px;">${name}</h3>
                <p style="color: #666; margin-bottom: 15px;">${profile.description}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div><strong>Total Votes:</strong> ${totalVotes}</div>
                    <div><strong>Unique Voters:</strong> ${uniqueVoters}</div>
                </div>
                <div style="margin-top: 10px;">
                    <strong>Top Items:</strong>
                    <ol style="margin-top: 10px;">
                        ${sortedItems.slice(0, 5).map(item => 
                            `<li>${item.item}: ${item.votes} votes</li>`
                        ).join('')}
                    </ol>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    modal.style.display = 'flex';
}

// Close stats modal
function closeStatsModal() {
    document.getElementById('statsModal').style.display = 'none';
}

// Update profile list
function updateProfileList() {
    const profileNames = Object.keys(profiles);
    
    if (profileNames.length === 0) {
        document.getElementById('profileList').innerHTML = '<p style="color: #999;">No profiles found</p>';
        return;
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('globalStatus');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}