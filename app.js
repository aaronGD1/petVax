// --- VARIABLES ---
const modal = document.getElementById('addPetForm');
const historyModal = document.getElementById('historyModal');
const addBtn = document.getElementById('addAnimalBtn');
const closeBtn = document.querySelector('.close');
const closeHistoryBtn = document.querySelector('.close-history');
const saveBtn = document.getElementById('savePetBtn');
const addHistoryBtn = document.getElementById('addHistoryBtn');
const reminderSelect = document.getElementById('reminderType');
const customInput = document.getElementById('customDaysInput');
const petList = document.getElementById('petList');
const emptyMsg = document.getElementById('emptyMsg');

let currentHistoryPetId = null;

// --- EVENT LISTENERS ---
addBtn.onclick = () => modal.style.display = "flex";
closeBtn.onclick = () => modal.style.display = "none";
closeHistoryBtn.onclick = () => historyModal.style.display = "none";

window.onclick = (e) => {
    if(e.target == modal) modal.style.display = "none";
    if(e.target == historyModal) historyModal.style.display = "none";
};

reminderSelect.onchange = () => {
    customInput.style.display = (reminderSelect.value === 'custom') ? 'block' : 'none';
};

document.addEventListener('DOMContentLoaded', loadPets);

// --- SAVE PET PROFILE ---
saveBtn.onclick = () => {
    const name = document.getElementById('petName').value.trim();
    const type = document.getElementById('petType').value;
    const lastVax = document.getElementById('lastVaxDate').value;
    const photoInput = document.getElementById('petPhoto');

    // Validation
    if(!name) return alert("Please enter a Name");
    if(reminderSelect.value !== 'none' && !lastVax) return alert("Please enter Last Vaccination Date");

    // 1. Calculate Next Date
    let nextDate = null; 

    if (reminderSelect.value !== 'none') {
        const vaxDate = new Date(lastVax);
        let calculatedDate = new Date(vaxDate);
        
        if(reminderSelect.value === 'yearly') {
            calculatedDate.setFullYear(calculatedDate.getFullYear() + 1);
        } else {
            const days = parseInt(document.getElementById('daysCount').value) || 0;
            calculatedDate.setDate(calculatedDate.getDate() + days);
        }
        nextDate = calculatedDate.toISOString(); 
    }

    // 2. Handle Photo
    const reader = new FileReader();
    let defaultImg = "happy.png"; 

    if(photoInput.files && photoInput.files[0]) {
        reader.readAsDataURL(photoInput.files[0]);
        reader.onload = function() { saveDataLogic(name, type, nextDate, reader.result, lastVax); };
    } else {
        saveDataLogic(name, type, nextDate, defaultImg, lastVax);
    }
};

function saveDataLogic(name, type, nextDate, photoData, lastVaxDate) {
    let pets = JSON.parse(localStorage.getItem('pets') || "[]");

    let existingIndex = pets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    let petId = Date.now();
    let history = [];
    let currentPhoto = photoData;

    if (existingIndex > -1) {
        // Pet exists: update logic
        const oldPet = pets[existingIndex];
        petId = oldPet.id;
        history = oldPet.history || [];
        
        // Keep old photo if user didn't upload new one
        if(photoData === "happy.png" && oldPet.photo !== "happy.png") {
            currentPhoto = oldPet.photo;
        }

        // Archive old future date if valid
        if(oldPet.nextDate) {
            history.unshift({ date: oldPet.nextDate, vaccineName: "Scheduled Vaccine", status: "Completed" });
        }
        pets.splice(existingIndex, 1);
    } 
    // New Pet + "No Future Dose" + "Last Date" entered -> Save as history immediately
    else if (!nextDate && lastVaxDate) {
        history.unshift({ date: lastVaxDate, vaccineName: "Initial Vaccine", status: "Completed" });
    }

    const pet = {
        id: petId,
        name: name,
        type: type,
        nextDate: nextDate, 
        photo: currentPhoto,
        history: history
    };

    pets.push(pet);
    localStorage.setItem('pets', JSON.stringify(pets));

    modal.style.display = "none";
    loadPets();
    alert("Pet Saved!");
    
    // Clear inputs
    document.getElementById('petName').value = "";
    document.getElementById('petPhoto').value = "";
    document.getElementById('lastVaxDate').value = "";
    document.getElementById('daysCount').value = "";
}

// --- LOAD & RENDER ---
function loadPets() {
    petList.innerHTML = "";
    let pets = JSON.parse(localStorage.getItem('pets') || "[]");

    if(pets.length === 0) {
        petList.appendChild(emptyMsg);
        emptyMsg.style.display = "block";
        return;
    }
    emptyMsg.style.display = "none";

    pets.forEach(pet => {
        let dateHtml = "";
        let calendarBtn = "";

        // Check if there is a next date
        if (pet.nextDate) {
            const dateObj = new Date(pet.nextDate);
            
            // Create Calendar File
            const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:${dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "").substring(0, 8)}\nSUMMARY:Vaccine: ${pet.name}\nDESCRIPTION:Vaccination due for ${pet.name}\nEND:VEVENT\nEND:VCALENDAR`;
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const downloadUrl = URL.createObjectURL(blob);

            dateHtml = `<div class="vax-date">${dateObj.toLocaleDateString()}</div>`;
            calendarBtn = `<a href="${downloadUrl}" download="${pet.name}_vax.ics" class="calendar-btn">📅 Add to Calendar</a>`;
        } else {
            // No Date Logic
            dateHtml = `<div class="vax-date" style="color:#4CAF50;">✅ Up to Date</div>`;
            calendarBtn = ``; 
        }

        const card = document.createElement('div');
        card.className = 'pet-card';
        card.innerHTML = `
            <img src="${pet.photo}" alt="Pet">
            <div class="pet-info">
                <h3>${pet.name} <small>(${pet.type})</small></h3>
                <p>${pet.nextDate ? "Next Due:" : "Status:"}</p>
                ${dateHtml}
                
                <div class="btn-group">
                    ${calendarBtn}
                    <button onclick="viewHistory(${pet.id})" class="history-btn">📜 History</button>
                    <button onclick="deletePet(${pet.id})" class="delete-btn">Delete</button>
                </div>
            </div>
        `;
        petList.appendChild(card);
    });
}

// --- VIEW HISTORY ---
window.viewHistory = (id) => {
    let pets = JSON.parse(localStorage.getItem('pets') || "[]");
    const pet = pets.find(p => p.id === id);
    
    currentHistoryPetId = id; 
    document.getElementById('historyPetName').innerText = `Record for: ${pet.name}`;
    renderHistoryList(pet);
    historyModal.style.display = "flex";
};

// --- ADD MANUAL HISTORY ---
addHistoryBtn.onclick = () => {
    const vName = document.getElementById('pastVaxName').value;
    const vDate = document.getElementById('pastVaxDate').value;

    if(!vName || !vDate) return alert("Please fill both Name and Date");

    let pets = JSON.parse(localStorage.getItem('pets') || "[]");
    let petIndex = pets.findIndex(p => p.id === currentHistoryPetId);

    if(petIndex > -1) {
        if(!pets[petIndex].history) pets[petIndex].history = [];
        
        pets[petIndex].history.push({
            vaccineName: vName,
            date: vDate,
            status: "Completed"
        });

        localStorage.setItem('pets', JSON.stringify(pets));
        renderHistoryList(pets[petIndex]);
        
        document.getElementById('pastVaxName').value = "";
        document.getElementById('pastVaxDate').value = "";
    }
};

function renderHistoryList(pet) {
    const listContainer = document.getElementById('historyList');
    listContainer.innerHTML = "";

    const sortedHistory = (pet.history || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedHistory.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; color:#999;'>No past records found.</p>";
    } else {
        sortedHistory.forEach((record, index) => {
            const d = new Date(record.date);
            const vName = record.vaccineName || "Vaccination"; 
            
            const div = document.createElement('div');
            div.className = 'history-card';
            div.innerHTML = `
                <div>
                    <div style="font-weight:bold;">${vName}</div>
                    <div style="font-size:0.85em; color:#666;">${d.toLocaleDateString()}</div>
                </div>
                <button onclick="deleteHistory(${index})" style="color:#999; border:none; background:none; font-size:16px; cursor:pointer;">&times;</button>
            `;
            listContainer.appendChild(div);
        });
    }
}

window.deleteHistory = (index) => {
    if(!confirm("Remove this entry?")) return;
    let pets = JSON.parse(localStorage.getItem('pets') || "[]");
    let petIndex = pets.findIndex(p => p.id === currentHistoryPetId);
    if(petIndex > -1) {
        pets[petIndex].history.splice(index, 1);
        localStorage.setItem('pets', JSON.stringify(pets));
        renderHistoryList(pets[petIndex]);
    }
};

// --- DELETE PET ---
window.deletePet = (id) => {
    if(confirm("Delete this pet completely?")) {
        let pets = JSON.parse(localStorage.getItem('pets') || "[]");
        pets = pets.filter(p => p.id !== id);
        localStorage.setItem('pets', JSON.stringify(pets));
        loadPets();
    }
};