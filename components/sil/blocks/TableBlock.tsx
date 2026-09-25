import type { TableBlock as TableBlockType } from "../types";

const HIGHLIGHT_CLASS = {
  success: "bg-green-500/20 text-green-300",
  warning: "bg-yellow-500/20 text-yellow-300",
  danger: "bg-red-500/20 text-red-300",
};

// "R$ 1.234,56", "17,0%", "-3", 42 → alinha à direita, como numa planilha
function ehNumero(cell: string | number | undefined) {
  if (typeof cell === "number") return true;
  if (typeof cell !== "string") return false;
  return /^[-+]?\s*(R\$\s*)?[-+]?[\d.,]+\s*%?$/.test(cell.replace(/\s/g, " ").trim());
}

export function TableBlock({ block }: { block: TableBlockType }) {
  function cellClass(rowIdx: number, colIdx: number) {
    const h = block.highlights?.find((x) => x.rowIndex === rowIdx && x.colIndex === colIdx);
    return h ? HIGHLIGHT_CLASS[h.style] : "";
  }

  // Uma coluna é numérica quando todas as células preenchidas são números
  const colunaNumerica = block.headers.map((_, colIdx) => {
    const celulas = block.rows.map((row) => row[colIdx]).filter((c) => c !== "" && c !== null && c !== undefined);
    return celulas.length > 0 && celulas.every(ehNumero);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
      {block.title && (
        <div className="border-b border-border/60 px-4 py-2.5">
          <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04]">
            <tr>
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  className={`whitespace-nowrap px-4 py-2 text-xs font-medium text-muted ${
                    colunaNumerica[i] ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border/40 odd:bg-transparent even:bg-white/[0.02]">
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className={`px-4 py-2 text-sm text-foreground ${
                      colunaNumerica[colIdx] ? "whitespace-nowrap text-right tabular-nums" : ""
                    } ${cellClass(rowIdx, colIdx)}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
