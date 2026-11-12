import assert from "node:assert/strict";
import test from "node:test";
import { buildLowScoreRecommendations } from "../lib/phase6-recommendations.ts";

test("membuat draf saran hanya untuk skor valid di bawah 3",()=>{
  const recommendations=buildLowScoreRecommendations([
    {indicatorId:"i1",indicatorName:"Analisis",aspectName:"Intelektualitas",scopeKey:"session:v1",score:2.5},
    {indicatorId:"i2",indicatorName:"Kolaborasi",aspectName:"Humanitas",scopeKey:"session:v1",score:3},
    {indicatorId:"i3",indicatorName:"Refleksi",aspectName:"Religiusitas",scopeKey:"session:v1",score:null},
  ]);
  assert.equal(recommendations.length,1);
  assert.match(recommendations[0].recommendation,/Analisis/);
  assert.match(recommendations[0].recommendation,/Draf otomatis/);
  assert.equal(recommendations[0].evidenceReference.score,2.5);
});

test("mengambil skor paling rendah jika indikator yang sama muncul di beberapa cakupan",()=>{
  const recommendations=buildLowScoreRecommendations([
    {indicatorId:"i1",indicatorName:"Analisis",aspectName:"Intelektualitas",scopeKey:"session:v1",score:2.7},
    {indicatorId:"i1",indicatorName:"Analisis",aspectName:"Intelektualitas",scopeKey:"session:v2",score:1.8},
  ]);
  assert.equal(recommendations.length,1);
  assert.equal(recommendations[0].evidenceReference.score,1.8);
  assert.equal(recommendations[0].evidenceReference.scopeKey,"session:v2");
});
