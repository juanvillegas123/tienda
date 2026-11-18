import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bs', standalone: true })
export class BsPipe implements PipeTransform {
    transform(centavos: number | null | undefined): string {
        if (centavos == null) return 'Bs. —';
        const bolivianos = centavos / 100;
        return `Bs. ${bolivianos.toLocaleString('es-BO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
}
