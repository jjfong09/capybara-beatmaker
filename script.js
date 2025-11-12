// Music Generator Playground
// Implements note cycling and staff positioning based on Figma design

class MusicGenerator {
    constructor() {
        this.notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        this.audioContext = null;
        
        // Note frequencies (C4 to B4)
        this.noteFrequencies = {
            'C': 261.63,  // C4
            'D': 293.66,  // D4
            'E': 329.63,  // E4
            'F': 349.23,  // F4
            'G': 392.00,  // G4
            'A': 440.00,  // A4
            'B': 493.88   // B4
        };
        
        // Staff line positions (from music container top)
        // Staff area starts at 175px from container top, padding 20px
        // Lines are at: 20px, 50px, 80px, 110px, 140px from staff area top
        this.lineSpacing = 30; // Space between lines
        
        // Note positions on staff (top position in pixels from music container top)
        // Staff area is at: left: 180px, top: 175px, width: 600px, height: 200px
        // Staff lines are at: 20, 50, 80, 110, 140 (from staff area top)
        // Top line (line 1): 175 + 20 = 195px
        // Bottom line (line 5): 175 + 140 = 315px
        this.staffAreaElement = document.querySelector('.staff-area');
        this.noteCircles = Array.from(document.querySelectorAll('.note-circle'));
        this.columns = Math.max(this.noteCircles.length, 1);

        const staffComputed = window.getComputedStyle(this.staffAreaElement);
        this.staffAreaTop = parseFloat(staffComputed.top) || 0;
        this.staffAreaLeft = parseFloat(staffComputed.left) || 0;
        this.staffPadding = 20; // Padding inside staff area
        this.noteDiameter = this.noteCircles.length ? parseFloat(window.getComputedStyle(this.noteCircles[0]).width) : 60;
        this.noteRadius = this.noteDiameter / 2;

        // Calculate positions: A (highest) at top line, C (lowest) at bottom line
        // Evenly space all notes between them
        const topLine = this.staffAreaTop + this.staffPadding; // Line 1
        const bottomLine = this.staffAreaTop + this.staffPadding + 140; // Line 5
        const topPosition = topLine - this.noteRadius; // A position (centered on top line)
        const bottomPosition = bottomLine - this.noteRadius; // C position (centered on bottom line)
        const range = bottomPosition - topPosition; // Total range = 120px
        
        // Notes ordered from lowest to highest: C, D, E, F, G, A, B
        // Space them evenly: 6 intervals between 7 notes
        const interval = range / 6;
        const ascendingNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        
        this.notePositions = {};
        ascendingNotes.forEach((note, index) => {
            this.notePositions[note] = bottomPosition - (interval * index);
        });
        
        this.isPlaying = false;
        
        this.initAudio();
        this.setupEventListeners();
        this.initializeCircles();
    }
    
    initializeCircles() {
        const staffWidth = this.staffAreaElement.offsetWidth;
        const usableLeft = this.staffAreaLeft + this.staffPadding - this.noteRadius;
        const usableRight = this.staffAreaLeft + staffWidth - this.staffPadding - this.noteRadius;
        const totalRange = usableRight - usableLeft;
        const compression = 0.9; // close to edges but slightly inset
        const adjustedRange = totalRange * compression;
        const offset = (totalRange - adjustedRange) / 2;
        const spacing = this.columns > 1 ? adjustedRange / (this.columns - 1) : 0;

        this.noteCircles.forEach((circle, index) => {
            const columnIndex = circle.dataset.index ? parseInt(circle.dataset.index, 10) : index;
            const leftPosition = usableLeft + offset + spacing * columnIndex;
            circle.style.left = `${leftPosition}px`;

            const note = circle.dataset.note || 'C';
            const noteTop = this.notePositions[note] ?? this.notePositions['C'];
            circle.dataset.note = note;
            circle.querySelector('.note-letter').textContent = note;
            circle.style.top = `${noteTop}px`;
        });
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported');
        }
    }
    
    setupEventListeners() {
        this.noteCircles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                this.cycleNote(e.currentTarget);
            });
        });

        const playButton = document.querySelector('.play-btn');
        const clearButton = document.querySelector('.clear-btn');

        if (playButton) {
            playButton.addEventListener('click', () => {
                this.playSequence();
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearNotes();
            });
        }
    }
    
    cycleNote(circle) {
        const currentNote = circle.dataset.note;
        const currentIndex = this.notes.indexOf(currentNote);
        
        // Get next note in sequence
        const nextIndex = (currentIndex + 1) % this.notes.length;
        const nextNote = this.notes[nextIndex];
        
        // Update the note
        circle.dataset.note = nextNote;
        circle.querySelector('.note-letter').textContent = nextNote;
        
        // Update position on staff
        const newTop = this.notePositions[nextNote];
        circle.style.top = `${newTop}px`;
        
        // Add animation
        circle.classList.add('changing');
        setTimeout(() => {
            circle.classList.remove('changing');
        }, 300);
        
        // Play the note
        this.playNote(nextNote);
    }
    
    async playNote(note) {
        if (!this.audioContext) return;
        
        // Resume audio context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        const frequency = this.noteFrequencies[note];
        if (!frequency) return;
        
        // Create oscillator for piano-like sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Envelope for natural sound decay
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        
        // Add harmonics for richer sound
        [2, 3].forEach(harmonic => {
            const harmonicOsc = this.audioContext.createOscillator();
            const harmonicGain = this.audioContext.createGain();
            
            harmonicOsc.type = 'sine';
            harmonicOsc.frequency.value = frequency * harmonic;
            
            const harmonicNow = this.audioContext.currentTime;
            harmonicGain.gain.setValueAtTime(0, harmonicNow);
            harmonicGain.gain.linearRampToValueAtTime(0.1 / harmonic, harmonicNow + 0.01);
            harmonicGain.gain.exponentialRampToValueAtTime(0.001, harmonicNow + 0.3);
            
            harmonicOsc.connect(harmonicGain);
            harmonicGain.connect(this.audioContext.destination);
            
            harmonicOsc.start(harmonicNow);
            harmonicOsc.stop(harmonicNow + 0.3);
        });
    }

    async playSequence() {
        if (this.isPlaying) return;

        if (!this.noteCircles.length) return;

        const sortedCircles = [...this.noteCircles].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));

        this.isPlaying = true;

        for (const circle of sortedCircles) {
            const note = circle.dataset.note;
            if (!note) continue;

            circle.classList.add('playing');
            this.playNote(note);

            await new Promise(resolve => setTimeout(resolve, 400));
            circle.classList.remove('playing');

            if (!this.isPlaying) {
                break;
            }
        }

        this.isPlaying = false;
    }

    clearNotes() {
        this.noteCircles.forEach(circle => {
            const defaultNote = 'C';
            circle.dataset.note = defaultNote;
            circle.querySelector('.note-letter').textContent = defaultNote;
            const top = this.notePositions[defaultNote];
            if (typeof top === 'number') {
                circle.style.top = `${top}px`;
            }
            circle.classList.remove('playing');
        });
        this.isPlaying = false;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicGenerator();
});
