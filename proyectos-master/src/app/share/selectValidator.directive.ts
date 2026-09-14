import { Validator, AbstractControl, NG_VALIDATORS } from '@angular/forms';
import { Directive } from '@angular/core';

@Directive({
    selector: '[appSelectValidator]',
    providers: [{
        provide: NG_VALIDATORS,
        useExisting: SelectValidatorDirective,
        multi: true
    }]
})

export class SelectValidatorDirective implements Validator {

    validate(control: AbstractControl): { [key: string]: any } | null {
        //console.log(control.value);
        return control.value == "0" ? { 'defaultSelected': true } : null;
    }

}