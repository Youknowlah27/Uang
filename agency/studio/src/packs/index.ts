import type {Pack} from '../lib/pack';
import type {StyleId} from '../lib/types';
import {applePack} from './apple';
import {dataPack} from './data';
import {paperPack} from './paper';

export const PACKS: Record<StyleId, Pack> = {apple: applePack, data: dataPack, paper: paperPack};
