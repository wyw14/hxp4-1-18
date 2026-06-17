type Color = 'red' | 'yellow' | 'blue' | 'green';

const COLORS: Color[] = ['red', 'yellow', 'blue', 'green'];
const SAVE_KEY = 'color-memory-game-save';

interface HighScoreResponse {
  highScore: number;
  isNewRecord?: boolean;
}

interface GameSave {
  sequence: Color[];
  playerIndex: number;
  level: number;
}

class ColorMemoryGame {
  private sequence: Color[] = [];
  private playerIndex: number = 0;
  private isPlaying: boolean = false;
  private isShowingSequence: boolean = false;
  private level: number = 0;
  private highScore: number = 0;

  private readonly buttons: NodeListOf<HTMLButtonElement>;
  private readonly startBtn: HTMLButtonElement;
  private readonly currentLevelEl: HTMLElement;
  private readonly highScoreEl: HTMLElement;
  private readonly gameStatusEl: HTMLElement;
  private readonly saveModal: HTMLElement;
  private readonly resumeBtn: HTMLButtonElement;
  private readonly abandonBtn: HTMLButtonElement;
  private readonly savedLevelEl: HTMLElement;

  private readonly lightOnDuration: number = 600;
  private readonly lightOffDuration: number = 300;

  constructor() {
    this.buttons = document.querySelectorAll('.color-btn');
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.currentLevelEl = document.getElementById('current-level') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLElement;
    this.saveModal = document.getElementById('save-modal') as HTMLElement;
    this.resumeBtn = document.getElementById('resume-btn') as HTMLButtonElement;
    this.abandonBtn = document.getElementById('abandon-btn') as HTMLButtonElement;
    this.savedLevelEl = document.getElementById('saved-level') as HTMLElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.fetchHighScore();
    this.checkSavedGame();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());
    this.resumeBtn.addEventListener('click', () => this.resumeGame());
    this.abandonBtn.addEventListener('click', () => this.abandonSave());

    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = (e.target as HTMLButtonElement).dataset.color as Color;
        this.handlePlayerInput(color);
      });
    });

    window.addEventListener('beforeunload', () => this.saveGame());
  }

  private saveGame(): void {
    if (!this.isPlaying || this.isShowingSequence) return;

    const save: GameSave = {
      sequence: [...this.sequence],
      playerIndex: this.playerIndex,
      level: this.level,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  private loadGame(): GameSave | null {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved) as GameSave;
    } catch (error) {
      console.error('读取存档失败:', error);
      return null;
    }
  }

  private clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private checkSavedGame(): void {
    const save = this.loadGame();
    if (!save) return;

    this.savedLevelEl.textContent = save.level.toString();
    this.saveModal.style.display = 'flex';
    this.startBtn.disabled = true;
  }

  private resumeGame(): void {
    const save = this.loadGame();
    if (!save) return;

    this.sequence = [...save.sequence];
    this.playerIndex = save.playerIndex;
    this.level = save.level;
    this.isPlaying = true;

    this.currentLevelEl.textContent = this.level.toString();
    this.setButtonsDisabled(false);
    this.startBtn.disabled = true;
    this.saveModal.style.display = 'none';

    this.showStatus(`第 ${this.level} 关 - 请按顺序点击按钮（进度 ${this.playerIndex}/${this.sequence.length}）`, 'playing');
  }

  private abandonSave(): void {
    this.clearSave();
    this.saveModal.style.display = 'none';
    this.startBtn.disabled = false;
  }

  private async fetchHighScore(): Promise<void> {
    try {
      const response = await fetch('/api/highscore');
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }

  private async saveHighScore(score: number): Promise<void> {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });
      const data = await response.json() as HighScoreResponse;
      this.highScore = data.highScore;
      this.highScoreEl.textContent = this.highScore.toString();

      if (data.isNewRecord) {
        this.showStatus('🎉 新纪录！', 'success');
      }
    } catch (error) {
      console.error('保存最高分失败:', error);
    }
  }

  private startGame(): void {
    this.clearSave();
    this.sequence = [];
    this.playerIndex = 0;
    this.level = 0;
    this.isPlaying = true;
    this.currentLevelEl.textContent = '0';
    
    this.setButtonsDisabled(true);
    this.startBtn.disabled = true;
    
    this.showStatus('游戏开始！', 'playing');
    this.nextRound();
  }

  private nextRound(): void {
    this.level++;
    this.currentLevelEl.textContent = this.level.toString();
    this.playerIndex = 0;

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sequence.push(randomColor);

    this.showStatus(`第 ${this.level} 关 - 记住序列`, 'playing');
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.sequence.length; i++) {
      const color = this.sequence[i];
      await this.lightUpButton(color);
      
      if (i < this.sequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    this.showStatus('请按顺序点击按钮', 'playing');
    this.saveGame();
  }

  private async lightUpButton(color: Color): Promise<void> {
    const button = this.getButtonByColor(color);
    if (!button) return;

    button.classList.add('active');
    await this.delay(this.lightOnDuration);
    button.classList.remove('active');
  }

  private getButtonByColor(color: Color): HTMLButtonElement | null {
    return document.querySelector(`.color-btn[data-color="${color}"]`);
  }

  private async handlePlayerInput(color: Color): Promise<void> {
    if (!this.isPlaying || this.isShowingSequence) return;

    const expectedColor = this.sequence[this.playerIndex];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.playerIndex++;
      this.saveGame();

      if (this.playerIndex === this.sequence.length) {
        this.showStatus('正确！准备下一关...', 'success');
        this.setButtonsDisabled(true);
        await this.delay(1000);
        this.nextRound();
      }
    } else {
      button?.classList.add('wrong');
      await this.delay(500);
      button?.classList.remove('wrong');

      this.gameOver();
    }
  }

  private async gameOver(): Promise<void> {
    this.isPlaying = false;
    this.setButtonsDisabled(true);
    this.startBtn.disabled = false;
    this.clearSave();

    const finalScore = this.level - 1;
    this.showStatus(`游戏结束！你完成了 ${finalScore} 关`, 'gameover');

    if (finalScore > this.highScore) {
      await this.saveHighScore(finalScore);
    }
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private showStatus(message: string, type: 'playing' | 'gameover' | 'success' | '' = ''): void {
    this.gameStatusEl.textContent = message;
    this.gameStatusEl.className = 'game-status';
    if (type) {
      this.gameStatusEl.classList.add(type);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new ColorMemoryGame();
