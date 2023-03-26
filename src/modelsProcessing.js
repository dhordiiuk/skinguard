import * as tf from "@tensorflow/tfjs";
import * as tflite from '@tensorflow/tfjs-tflite';
import skinStateModel from './models/skin_state_classifier_35.tflite';

export const SKIN_STATE = {
    0: 'healthy',
    1: 'sick'
}

export async function getFeaturesModel() {
    try {
        const MODEL_URL = '/models/features_extractor/model.json';
        return await tf.loadGraphModel(MODEL_URL);
    } catch (err) {
        console.log(err);
        console.log("failed load Features model");
    }
}

export async function getSkinStateModel() {
    try {
        const tfliteModel = await tflite.loadTFLiteModel(skinStateModel);
        console.log("loaded skinStateModel");
        return tfliteModel
    }
    catch (err) {
        console.log(err);
        console.log("failed load skinStateModel");
    }
}
