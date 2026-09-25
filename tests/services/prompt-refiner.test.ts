import { describe, it, expect } from 'vitest';
import { PromptRefiningService } from '../../src/services/ai/prompt-refiner';

describe('PromptRefiningService', () => {
  it('should return expert prompt engineering system prompt', () => {
    const sys = PromptRefiningService.getRefineSystemPrompt();
    expect(sys).toContain('Prompt Engineering Expert');
    expect(sys).toContain('[Role]');
    expect(sys).toContain('[Context]');
  });

  it('should format raw user prompt', () => {
    const user = PromptRefiningService.formatUserPrompt('write a blog post about AI');
    expect(user).toBe('Transform this into a Super Prompt:\n\n"write a blog post about AI"');
  });

  it('should highlight section tags and escape HTML safely', () => {
    const raw = '[Role]: Senior Developer\n[Context]: Web app with <script>alert(1)</script>\n[Task]: Refactor code';
    const highlighted = PromptRefiningService.highlightVariables(raw);

    expect(highlighted).toContain('<span class="var-role">[Role]</span>');
    expect(highlighted).toContain('<span class="var-context">[Context]</span>');
    expect(highlighted).toContain('<span class="var-task">[Task]</span>');
    expect(highlighted).not.toContain('<script>');
    expect(highlighted).toContain('&lt;script&gt;');
  });
});
