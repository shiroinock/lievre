# 端末の色のコントラスト

`npx tsx scripts/capture.tsx` が書き出します。基準は文字が 4.5、操作の部品と輪郭が 3 です。

## Paper

| 前景 | 背景 | 基準 | truecolor | 256色 | 256色の値 |
| --- | --- | ---: | ---: | ---: | --- |
| text | surface | 4.5 | 16.73 | 18.02 | ansi256(17) #00005f / ansi256(231) #ffffff |
| muted | surface | 4.5 | 7.60 | 8.32 | ansi256(239) #4e4e4e / ansi256(231) #ffffff |
| text | sunken | 4.5 | 14.39 | 15.53 | ansi256(17) #00005f / ansi256(255) #eeeeee |
| text | selected | 4.5 | 12.39 | 12.92 | ansi256(17) #00005f / ansi256(189) #d7d7ff |
| accent | surface | 4.5 | 8.76 | 10.60 | ansi256(20) #0000d7 / ansi256(231) #ffffff |
| onAccent | accent | 4.5 | 9.06 | 10.60 | ansi256(231) #ffffff / ansi256(20) #0000d7 |
| success | surface | 4.5 | 6.24 | 7.49 | ansi256(23) #005f5f / ansi256(231) #ffffff |
| warning | surface | 4.5 | 6.44 | 5.73 | ansi256(94) #875f00 / ansi256(231) #ffffff |
| danger | surface | 4.5 | 6.32 | 7.44 | ansi256(124) #af0000 / ansi256(231) #ffffff |
| focus | surface | 3 | 8.76 | 10.60 | ansi256(20) #0000d7 / ansi256(231) #ffffff |
| focus | bg | 3 | 8.24 | 9.14 | ansi256(20) #0000d7 / ansi256(255) #eeeeee |
| accent | selected | 3 | 6.49 | 7.60 | ansi256(20) #0000d7 / ansi256(189) #d7d7ff |
| border | surface | 3 | 3.60 | 3.43 | ansi256(103) #8787af / ansi256(231) #ffffff |

## Ink

| 前景 | 背景 | 基準 | truecolor | 256色 | 256色の値 |
| --- | --- | ---: | ---: | ---: | --- |
| text | surface | 4.5 | 15.38 | 14.69 | ansi256(255) #eeeeee / ansi256(234) #1c1c1c |
| muted | surface | 4.5 | 9.21 | 8.06 | ansi256(146) #afafd7 / ansi256(234) #1c1c1c |
| text | sunken | 4.5 | 17.05 | 17.26 | ansi256(255) #eeeeee / ansi256(232) #080808 |
| text | selected | 4.5 | 9.10 | 11.18 | ansi256(255) #eeeeee / ansi256(19) #0000af |
| accent | surface | 4.5 | 8.79 | 8.44 | ansi256(147) #afafff / ansi256(234) #1c1c1c |
| onAccent | accent | 4.5 | 8.73 | 8.92 | ansi256(17) #00005f / ansi256(147) #afafff |
| success | surface | 4.5 | 10.33 | 10.04 | ansi256(115) #87d7af / ansi256(234) #1c1c1c |
| warning | surface | 4.5 | 10.75 | 11.33 | ansi256(186) #d7d787 / ansi256(234) #1c1c1c |
| danger | surface | 4.5 | 8.90 | 9.74 | ansi256(217) #ffafaf / ansi256(234) #1c1c1c |
| focus | surface | 3 | 8.79 | 8.44 | ansi256(147) #afafff / ansi256(234) #1c1c1c |
| focus | bg | 3 | 9.47 | 9.28 | ansi256(147) #afafff / ansi256(233) #121212 |
| accent | selected | 3 | 5.20 | 6.42 | ansi256(147) #afafff / ansi256(19) #0000af |
| border | surface | 3 | 4.18 | 4.52 | ansi256(67) #5f87af / ansi256(234) #1c1c1c |
