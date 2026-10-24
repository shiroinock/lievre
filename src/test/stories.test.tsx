import { describe, it } from 'vitest';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../.storybook/preview';
setProjectAnnotations(preview);
const files=import.meta.glob('../stories/*.stories.tsx',{eager:true});
describe('Portable stories — render and play functions',()=>{
  for(const [file,module] of Object.entries(files)){
    const stories=composeStories(module as Parameters<typeof composeStories>[0]) as unknown as Record<string,{run:()=>Promise<void>}>;
    describe(file,()=>{for(const [name,Story] of Object.entries(stories)){it(name,async()=>{await Story.run()})}});
  }
});
