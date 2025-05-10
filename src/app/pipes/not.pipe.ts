import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'not',
  standalone: true // <-- Esta línea es crucial
})
export class NotPipe implements PipeTransform {
  transform(value: boolean): boolean {
    return !value;
  }
}