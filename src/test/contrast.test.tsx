import { describe,it,expect } from 'vitest';
import tokens from '../../tokens/tokens.json';
import { readFileSync } from 'node:fs';
const css=readFileSync('src/styles/kei.css','utf8');
type TokenSet=Record<string,{$value:string}>;
function themeTokens(theme:'paper'|'ink'){return {...tokens.paper,...(theme==='ink'?tokens.ink:{})} as TokenSet}
function resolve(set:TokenSet,key:string):string{const value=set[key].$value;const alias=value.match(/^var\(--k-(.+)\)$/);return alias?resolve(set,alias[1]):value}
function luminance(hex:string){const c=hex.slice(1).match(/.{2}/g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function ratio(a:string,b:string){const [lo,hi]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (hi+.05)/(lo+.05)}
describe('Semantic color contrast and token synchronization',()=>{
  it('keeps exchanged token values in sync with the CSS source',()=>{for(const [name,token] of Object.entries(tokens.paper)){expect(css).toContain(`--k-${name}:${token.$value}`)}for(const [name,token] of Object.entries(tokens.ink)){expect(css).toContain(`--k-${name}:${token.$value}`)}});
  for(const theme of ['paper','ink'] as const){
    const set=themeTokens(theme);
    for(const foreground of ['text','muted','subtle'])for(const background of ['bg','surface','surface-raised','surface-sunken']){
      it(`${theme}: ${foreground} / ${background} reaches 4.5:1`,()=>{expect(ratio(resolve(set,foreground),resolve(set,background))).toBeGreaterThanOrEqual(4.5)});
    }
    for(const tone of ['success','warning','danger','info']){
      it(`${theme}: ${tone} status text reaches 4.5:1`,()=>{expect(ratio(resolve(set,tone),resolve(set,`${tone}-soft`))).toBeGreaterThanOrEqual(4.5)});
    }
    // Status text is also used without a tinted container (metrics, errors, table actions).
    for(const foreground of ['success','warning','danger','info'])for(const background of ['bg','surface','surface-raised','surface-sunken']){
      it(`${theme}: ${foreground} text / ${background} reaches 4.5:1`,()=>{expect(ratio(resolve(set,foreground),resolve(set,background))).toBeGreaterThanOrEqual(4.5)});
    }
    for(const background of ['surface','surface-raised','surface-sunken','accent-soft','success-soft']){
      it(`${theme}: focus / ${background} reaches 3:1`,()=>{expect(ratio(resolve(set,'focus'),resolve(set,background))).toBeGreaterThanOrEqual(3)});
    }
    it(`${theme}: selected row text reaches 4.5:1`,()=>{expect(ratio(resolve(set,'text'),resolve(set,'success-soft'))).toBeGreaterThanOrEqual(4.5)});
    it(`${theme}: selected menu text reaches 4.5:1`,()=>{expect(ratio(resolve(set,'success'),resolve(set,'accent-soft'))).toBeGreaterThanOrEqual(4.5)});
    it(`${theme}: OFF switch thumb reaches 3:1`,()=>{expect(ratio(resolve(set,'border-strong'),resolve(set,'surface-sunken'))).toBeGreaterThanOrEqual(3)});
    for(const background of ['surface','surface-raised','surface-sunken']){
      it(`${theme}: control boundary / ${background} reaches 3:1`,()=>{expect(ratio(resolve(set,'border-strong'),resolve(set,background))).toBeGreaterThanOrEqual(3)});
    }
    it(`${theme}: primary hover text reaches 4.5:1`,()=>{expect(ratio(resolve(set,'on-accent'),resolve(set,'accent-hover'))).toBeGreaterThanOrEqual(4.5)});
    it(`${theme}: danger action text reaches 4.5:1`,()=>{expect(ratio(resolve(set,'surface'),resolve(set,'danger'))).toBeGreaterThanOrEqual(4.5)});
    it(`${theme}: enabled switch thumb reaches 3:1`,()=>{expect(ratio(resolve(set,'surface-raised'),resolve(set,'success'))).toBeGreaterThanOrEqual(3)});
    it(`${theme}: primary action text reaches 4.5:1`,()=>{expect(ratio(resolve(set,'on-accent'),resolve(set,'accent'))).toBeGreaterThanOrEqual(4.5)});
    it(`${theme}: focus ring reaches 3:1 on the working surface`,()=>{expect(ratio(resolve(set,'focus'),resolve(set,'bg'))).toBeGreaterThanOrEqual(3)});
  }
});
