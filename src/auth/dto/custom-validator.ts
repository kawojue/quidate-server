import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ async: false })
class LineConstraint implements ValidatorConstraintInterface {
    validate(line1: string, args: any) {
        const [relatedPropertyName] = args.constraints
        const relatedValue = (args.object as any)[relatedPropertyName]
        return line1 || relatedValue
    }

    defaultMessage(args: any) {
        const [relatedPropertyName] = args.constraints
        return `Either ${args.property} or ${relatedPropertyName} must be provided`
    }
}

export function LineNotEmpty(property: string, validationOptions?: ValidationOptions) {
    return (object: any, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: LineConstraint,
        })
    }
}

@ValidatorConstraint({ async: false })
class StateCityConstraint implements ValidatorConstraintInterface {
    validate(state: string, args: any) {
        const [relatedPropertyName] = args.constraints
        const relatedValue = (args.object as any)[relatedPropertyName]
        return state || relatedValue
    }

    defaultMessage(args: any) {
        const [relatedPropertyName] = args.constraints
        return `Either ${args.property} or ${relatedPropertyName} must be provided`
    }
}

export function StateCityNotEmpty(property: string, validationOptions?: ValidationOptions) {
    return (object: any, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [property],
            validator: StateCityConstraint,
        })
    }
}