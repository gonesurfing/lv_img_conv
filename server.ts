import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { convertImageBlob } from './lib/convert';
import { loadImage } from 'canvas';
import { ImageMode, ImageModeUtil, OutputMode } from './lib/enums';

const upload = multer();
const app = express();
app.use(cors());

interface Query { 
  cf: keyof typeof ImageMode; 
  output: string; 
  dither?: 'true'; 
  bigEndian?: 'true'; 
}

app.post(
  '/convert',
  upload.single('image'),
  async (req, res) => {
    try {
      const fileBuf = req.file.buffer as Buffer;
      const q = req.body as Query;

      // parse / validate your options
      const cf = ImageMode[q.cf];
      const output = q.output;
      const dither = q.dither === 'true';
      const bigEndian = q.bigEndian === 'true';

      // map output string → enums
      let outputMode = OutputMode.C;
      let binaryFormat: ImageMode | undefined;
      if (output === 'c_array') {
        outputMode = OutputMode.C;
      } else {
        outputMode = OutputMode.BIN;
        if (ImageModeUtil.isTrueColor(cf)) {
          const map: Record<string, ImageMode> = {
            bin_332: ImageMode.ICF_TRUE_COLOR_ARGB8332,
            bin_565: ImageMode.ICF_TRUE_COLOR_ARGB8565,
            bin_565_swap: ImageMode.ICF_TRUE_COLOR_ARGB8565_RBSWAP,
            bin_888: ImageMode.ICF_TRUE_COLOR_ARGB8888,
          };
          binaryFormat = map[output];
        }
      }

      // Prepare input: for RAW modes use Uint8Array, otherwise decode buffer to a Canvas Image
      let inputData: any;
      if (cf === ImageMode.CF_RAW || cf === ImageMode.CF_RAW_ALPHA) {
        inputData = new Uint8Array(fileBuf);
      } else {
        inputData = await loadImage(fileBuf);
      }
      const result = await convertImageBlob(
        inputData,
        {
          cf,
          outputFormat: outputMode,
          binaryFormat,
          swapEndian: bigEndian,
          dith: dither,
          outName: 'converted',
        }
      );

      if (outputMode === OutputMode.BIN) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(Buffer.from(result as ArrayBuffer));
      } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(result as string);
      }
    } catch (e) {
      console.error(e);
      res.status(500).send((e as Error).message);
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));